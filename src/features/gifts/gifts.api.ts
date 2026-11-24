import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse, PaginatedMeta } from '@/shared/types'

export type GiftStatus = 'unclaimed' | 'claimed'

export interface GiftAccountSummary {
  userId: string
  name: string
  email: string
  username: string | null
  avatarUrl: string | null
  isPublic: boolean
  active: boolean
  isEmailVerified: boolean
  status: GiftStatus
  claimedAt: string | null
  claimLinkExpiresAt: string | null
  createdAt: string
  createdBy: { id: string; name: string }
}

export interface GiftLink {
  id: string
  title: string
  url: string
  platform: string | null
  displayOrder: number
  isVisible: boolean
  clickCount: number
  icon_link: string | null
}

export interface GiftDisplay {
  selected_theme: string | null
}

export interface GiftAccountDetail extends GiftAccountSummary {
  profile: {
    id: string
    username: string | null
    bio: string | null
    location: string | null
    avatarUrl: string | null
    goals: string[]
    isPublic: boolean
    links: GiftLink[]
    display: GiftDisplay | null
  } | null
}

/** Shown once: the backend never stores or returns the raw token again. */
export interface ClaimLink {
  claimUrl: string
  qrCodeDataUrl: string
  expiresAt: string
  emailStatus: 'sent' | 'failed' | 'skipped'
  emailError?: string
}

export interface CreateGiftInput {
  name: string
  username: string
  email: string
  sendEmail: boolean
}

export interface ProfileInput {
  displayName?: string
  username?: string
  bio?: string
  location?: string
  isPublic?: boolean
}

export interface LinkInput {
  title: string
  url: string
  platform?: string
  isVisible?: boolean
}

const base = (userId: string) => `/admin/gift-accounts/${encodeURIComponent(userId)}`

export async function listGiftAccounts(
  params: { page: number; q?: string; status?: GiftStatus },
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<
    ApiResponse<{ accounts: GiftAccountSummary[]; pagination: PaginatedMeta }>
  >('/admin/gift-accounts', {
    params: { page: params.page, limit: 20, q: params.q || undefined, status: params.status },
    signal,
  })
  return data.data
}

export async function createGiftAccount(body: CreateGiftInput) {
  const { data } = await apiClient.post<
    ApiResponse<{ account: GiftAccountSummary; claim: ClaimLink }>
  >('/admin/gift-accounts', body)
  return data.data
}

export async function getGiftAccount(userId: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<GiftAccountDetail>>(base(userId), { signal })
  return data.data
}

export async function deleteGiftAccount(userId: string) {
  const { data } = await apiClient.delete<ApiResponse<null>>(base(userId))
  return data.data
}

export async function issueClaimLink(userId: string, body: { email?: string; sendEmail: boolean }) {
  const { data } = await apiClient.post<ApiResponse<ClaimLink>>(`${base(userId)}/claim-link`, body)
  return data.data
}

export async function updateGiftProfile(userId: string, body: ProfileInput) {
  const { data } = await apiClient.patch<ApiResponse<unknown>>(`${base(userId)}/profile`, body)
  return data.data
}

export async function uploadGiftAvatar(userId: string, file: File) {
  const form = new FormData()
  form.append('avatar', file)
  const { data } = await apiClient.patch<ApiResponse<unknown>>(`${base(userId)}/profile/avatar`, form)
  return data.data
}

export async function deleteGiftAvatar(userId: string) {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(`${base(userId)}/profile/avatar`)
  return data.data
}

export async function setGiftTheme(userId: string, themeId: string | null) {
  const { data } = await apiClient.put<ApiResponse<unknown>>(`${base(userId)}/preferences`, {
    selected_theme: themeId,
  })
  return data.data
}

export async function createGiftLink(userId: string, body: LinkInput) {
  const { data } = await apiClient.post<ApiResponse<GiftLink>>(`${base(userId)}/links`, body)
  return data.data
}

export async function updateGiftLink(userId: string, linkId: string, body: Partial<LinkInput>) {
  const { data } = await apiClient.patch<ApiResponse<GiftLink>>(
    `${base(userId)}/links/${encodeURIComponent(linkId)}`,
    body,
  )
  return data.data
}

export async function deleteGiftLink(userId: string, linkId: string) {
  const { data } = await apiClient.delete<ApiResponse<unknown>>(
    `${base(userId)}/links/${encodeURIComponent(linkId)}`,
  )
  return data.data
}

export async function reorderGiftLinks(userId: string, ids: string[]) {
  const { data } = await apiClient.patch<ApiResponse<unknown>>(`${base(userId)}/links/reorder/all`, {
    links: ids.map((id, displayOrder) => ({ id, displayOrder })),
  })
  return data.data
}
