import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { toast } from 'sonner'
import { auth } from '../config/firebase'

export const PRODUCTION_API_URL = 'https://foodai-1-cht5.onrender.com'

function isNativeMobile(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function resolveApiOrigin(): string {
  const envUrl = import.meta.env.VITE_API_URL?.trim()
  if (isNativeMobile()) {
    // Native Android/iOS APKs cannot reach desktop localhost; force live production backend.
    if (!envUrl || /localhost|127\.0\.0\.1/i.test(envUrl)) {
      return PRODUCTION_API_URL
    }
    return envUrl.replace(/\/+$/, '')
  }
  return envUrl ? envUrl.replace(/\/+$/, '') : ''
}

const origin = resolveApiOrigin()
const apiBase = origin ? `${origin}/api` : '/api'

const aiOrigin = import.meta.env.VITE_AI_API_URL?.trim()
const aiApiBase = aiOrigin && !(isNativeMobile() && /localhost|127\.0\.0\.1/i.test(aiOrigin))
  ? `${aiOrigin.replace(/\/+$/, '')}/api/ai`
  : `${apiBase}/ai`

const client = axios.create({
  baseURL: apiBase,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const aiClient = axios.create({
  baseURL: aiApiBase,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Custom Axios adapter using CapacitorHttp for native Android/iOS JSON requests.
 * Bypassing WebView CORS prevents false "Network Error" failures on mobile without
 * patching global window.fetch (keeping Firebase Firestore long-polling untouched).
 */
async function capacitorHttpAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const uri = axios.getUri(config)
  const fullUrl = /^https?:\/\//i.test(uri)
    ? uri
    : `${(config.baseURL || '').replace(/\/+$/, '')}/${uri.replace(/^\/+/, '')}`

  const headers: Record<string, string> = {}
  const rawHeaders =
    typeof (config.headers as any)?.toJSON === 'function'
      ? (config.headers as any).toJSON()
      : config.headers || {}

  for (const [key, val] of Object.entries(rawHeaders)) {
    if (val !== undefined && val !== null && typeof val !== 'object') {
      headers[key] = String(val)
    }
  }

  const method = (config.method || 'GET').toUpperCase()
  let payloadData = config.data
  if (typeof payloadData === 'string' && headers['Content-Type']?.includes('application/json')) {
    try {
      payloadData = JSON.parse(payloadData)
    } catch {
      // Keep original string if not valid JSON
    }
  }

  try {
    const nativeRes = await CapacitorHttp.request({
      url: fullUrl,
      method,
      headers,
      ...(method !== 'GET' && method !== 'HEAD' && payloadData !== undefined
        ? { data: payloadData }
        : {}),
      connectTimeout: config.timeout || 25000,
      readTimeout: config.timeout || 25000,
      responseType: (config.responseType as any) || 'json',
    })

    const axiosResponse: AxiosResponse = {
      data: nativeRes.data,
      status: nativeRes.status,
      statusText: String(nativeRes.status),
      headers: nativeRes.headers || {},
      config,
    }

    const validateStatus =
      config.validateStatus || ((status: number) => status >= 200 && status < 300)
    if (!validateStatus(nativeRes.status)) {
      const errMsg =
        (nativeRes.data && (nativeRes.data.detail || nativeRes.data.message)) ||
        `Request failed with status code ${nativeRes.status}`
      throw new AxiosError(errMsg, AxiosError.ERR_BAD_RESPONSE, config, null, axiosResponse)
    }

    return axiosResponse
  } catch (err: any) {
    if (err instanceof AxiosError) {
      throw err
    }
    const isTimeout = err?.message?.toLowerCase().includes('timeout')
    throw new AxiosError(
      isTimeout ? 'timeout of request exceeded' : 'Network Error',
      isTimeout ? AxiosError.ECONNABORTED : AxiosError.ERR_NETWORK,
      config,
    )
  }
}

function attachInterceptors(instance: typeof client) {
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        const user = auth.currentUser
        if (user && config.headers) {
          const token = await user.getIdToken()
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.error('Error getting Firebase token:', error)
      }

      if (isNativeMobile() && !(config.data instanceof FormData)) {
        config.adapter = capacitorHttpAdapter
      }

      return config
    },
    (error) => Promise.reject(error),
  )

  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const url = error.config?.url || ''
      const isFallbackHandled =
        url.includes('analyze') ||
        url.includes('chat') ||
        url.includes('daily-logs') ||
        url.includes('scans') ||
        url.includes('users/profile') ||
        url.includes('weekly-progress') ||
        url.includes('products/') ||
        url.includes('additives/') ||
        url.includes('scan/')

      if (error.response?.status === 401) {
        console.warn('API request returned 401 Unauthorized:', url)
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.warn('Backend request timed out; engaging offline fallback:', url)
      } else if (isFallbackHandled) {
        console.debug('Backend notice on fallback-capable route:', url, error.message)
      } else if (error.response?.data) {
        const data = error.response.data as { detail?: string; message?: string }
        const message = data.detail || data.message || 'Something went wrong'
        toast.error(message)
      } else if (error.message === 'Network Error') {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error(error.message || 'An unexpected error occurred')
      }
      return Promise.reject(error)
    },
  )
}

attachInterceptors(client)
attachInterceptors(aiClient)

export default client
