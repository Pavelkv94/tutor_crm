import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, setAccessToken, removeAccessToken } from './token-utils'
import { showErrorToast } from './toast'
import type { ApiError } from '@/types'

const API_BASE_URL = 'http://localhost:5000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (error?: unknown) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post<{ accessToken: string }>(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        )

        const { accessToken } = response.data
        setAccessToken(accessToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }

        processQueue(null, accessToken)
        isRefreshing = false

        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        removeAccessToken()
        isRefreshing = false
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Show toast notification for error responses (400, 404, 500, etc.)
    // Skip 401 errors as they are handled above
    if (error.response?.status && error.response.status !== 401) {
      const apiError = error.response.data
      if (apiError) {
        showErrorToast(apiError)
      } else {
        // Fallback for errors without proper API error format
        const statusText = error.response.statusText || 'Ошибка'
        showErrorToast({
          statusCode: error.response.status,
          path: originalRequest?.url || '',
          message: statusText,
        })
      }
    }

    return Promise.reject(error)
  }
)

