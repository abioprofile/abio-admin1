import { getRefreshToken } from '@/shared/lib/auth-tokens'
import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse } from '@/shared/types'

import type {
  LoginPayload,
  LoginResponseData,
  RefreshResponseData,
  RefreshTokenPayload,
  User,
} from '@/features/auth/types'

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', payload)
  return data
}

export async function refreshSession(payload: RefreshTokenPayload) {
  const { data } = await apiClient.post<ApiResponse<RefreshResponseData>>('/auth/refresh', payload)
  return data
}

export async function logout() {
  const { data } = await apiClient.post<ApiResponse<null>>('/auth/logout', { refreshToken: getRefreshToken() ?? undefined })
  return data
}

export async function getCurrentUser() {
  const { data } = await apiClient.get<ApiResponse<User>>('/user/me')
  return data
}
