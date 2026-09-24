import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse, PaginatedMeta } from '@/shared/types'

export interface BusinessInquiry {
  id: string
  companyName: string
  fullName: string
  email: string
  phone: string
  companySize: string
  industry: string
  features: string[]
  createdAt: string
  user: { id: string; name: string; email: string } | null
}

export async function listBusinessInquiries(page: number, q?: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<{
    inquiries: BusinessInquiry[]
    pagination: PaginatedMeta
  }>>('/admin/business-inquiries', { params: { page, limit: 20, q: q || undefined }, signal })
  return data.data
}

export async function getBusinessInquiry(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<BusinessInquiry>>(
    `/admin/business-inquiries/${encodeURIComponent(id)}`, { signal },
  )
  return data.data
}
