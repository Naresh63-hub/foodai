import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { auth } from '../config/firebase'
import { AUTH_BYPASS } from '../config/authMode'

const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api`
  : '/api'

const client = axios.create({
  baseURL: apiBase,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use(
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
    return config
  },
  (error) => Promise.reject(error),
)

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (!AUTH_BYPASS) {
        toast.error('Session expired. Please log in again.')
        window.location.href = '/login'
      }
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

export default client
