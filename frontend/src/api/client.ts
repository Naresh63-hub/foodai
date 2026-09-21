import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      window.location.href = '/login'
      toast.error('Session expired. Please log in again.')
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
