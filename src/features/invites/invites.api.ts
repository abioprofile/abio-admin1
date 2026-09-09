import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse, PaginatedMeta } from '@/shared/types'
export interface Invite {
  id: string
  email: string
  role: 'moderator'
  status: 'pending' | 'accepted' | 'expired'
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  invitedBy: { name: string; email: string } | null
  acceptedUser: { name: string; email: string } | null
}
export interface CreatedInvite {
  id: string
  email: string
  role: 'moderator'
  token: string
  inviteUrl: string
  expiresAt: string
}
export async function listInvites(
  params: { page: number; status?: string },
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<
    ApiResponse<{ invites: Invite[]; pagination: PaginatedMeta }>
  >('/admin/invites', { params, signal })
  return data.data
}
export async function createInvite(email: string) {
  const { data } = await apiClient.post<ApiResponse<CreatedInvite>>(
    '/admin/invites',
    { email },
  )
  return data.data
}
export async function acceptInvite(token: string) {
  const { data } = await apiClient.post<
    ApiResponse<{ role: string; email: string }>
  >('/admin/invites/accept', { token })
  return data.data
}
