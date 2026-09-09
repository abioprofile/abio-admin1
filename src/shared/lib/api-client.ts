import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/features/auth/store/auth-store'
import { queryClient } from '@/shared/lib/query-client'
import { API_BASE_URL } from '@/shared/lib/env'
import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from '@/shared/lib/auth-tokens'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

function expireSession() {
  useAuthStore.getState().signOut()
  queryClient.clear()
}

let refreshPromise: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken()
      const accessToken = getAccessToken()

      try {
        const { data } = await axios.post<{
          data: { accessToken: string; refreshToken: string }
        }>(
          `${API_BASE_URL}/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true },
        )

        if (
          getAccessToken() !== accessToken ||
          getRefreshToken() !== refreshToken
        )
          return null
        setAuthTokens(data.data.accessToken, data.data.refreshToken)
        return data.data.accessToken
      } catch {
        if (
          getAccessToken() === accessToken &&
          getRefreshToken() === refreshToken
        )
          expireSession()
        return null
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const isAuthEndpoint =
      config?.url?.includes('/auth/login') ||
      config?.url?.includes('/auth/refresh') ||
      config?.url?.includes('/auth/logout')

    if (
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      !isAuthEndpoint
    ) {
      config._retried = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        config.headers.Authorization = `Bearer ${newToken}`
        return apiClient(config)
      }
    }

    if (error.response?.status === 401 && config?._retried && !isAuthEndpoint)
      expireSession()
    return Promise.reject(error)
  },
)
