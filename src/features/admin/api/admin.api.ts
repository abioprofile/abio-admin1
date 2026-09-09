import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse } from '@/shared/types'

import type { StaffProfile } from '@/features/admin/types'

export async function getAdminMe() {
  const { data } = await apiClient.get<ApiResponse<StaffProfile>>('/admin/me')
  return data
}

export async function getMetrics(signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<import('../types').DashboardMetrics>>('/admin/astore/metrics', { signal })
  return data.data
}
