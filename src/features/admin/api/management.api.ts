import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse, PaginatedMeta } from '@/shared/types'
export interface Variant {
  id: string
  colorName: string
  colorHex: string | null
  stockQty: number
  priceKobo: number | null
  imageUrls: string[]
  active: boolean
}
export interface ProductMetadata {
  tagline?: string
  badge?: string
  features?: string[]
  preview?: {
    enabled: boolean
    defaultColor: string
    frontOverlayUrl?: string
    backOverlayUrl?: string
  }
}
export interface Product {
  imageUrls: string[]
  metadata: ProductMetadata
  id: string
  name: string
  slug: string
  description: string | null
  type: 'standard' | 'custom'
  currency: string
  basePriceKobo: number
  active: boolean
  variants: Variant[]
}
export interface ProductInput {
  imageUrls?: string[]
  metadata?: ProductMetadata
  name: string
  slug?: string
  description?: string | null
  type: 'standard' | 'custom'
  currency: string
  basePriceKobo: number
  active: boolean
}
export type VariantInput = Omit<Variant, 'id'>
export interface UserRow {
  id: string
  name: string
  email: string
  active: boolean
  isEmailVerified: boolean
  createdAt: string
  roles: string[]
  hasBadge: boolean
}
export interface Badge {
  id: string
  badgeType: string
  assignedAt: string
  revokedAt: string | null
  revokeReason: string | null
}
export interface UserDetail extends UserRow {
  profile: {
    username: string
    avatarUrl: string | null
    bio: string | null
    isPublic: boolean
    location: string | null
  } | null
  badges: Badge[]
}
export interface BadgeRequest {
  id: string
  userId: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  idDocumentUrl: string
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  user: { id: string; name: string; email: string }
}
export type Filters = Record<string, string | number | undefined>
async function get<T>(
  path: string,
  params?: Filters,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = await apiClient.get<ApiResponse<T>>(path, { params, signal })
  return data.data
}
async function write<T>(
  method: 'post' | 'patch',
  path: string,
  body: unknown,
): Promise<T> {
  const { data } = await apiClient[method]<ApiResponse<T>>(path, body)
  return data.data
}
export const management = {
  uploadProductAsset: (id: string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return write<{ url: string; publicId: string }>('post', `/admin/astore/products/${id}/assets`, form)
  },
  uploadProductImage: (id: string, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return write<Product>('post', `/admin/astore/products/${id}/images`, form)
  },
  products: (filters: Filters, signal?: AbortSignal) =>
    get<{ products: Product[]; pagination: PaginatedMeta }>(
      '/admin/astore/products',
      filters,
      signal,
    ),
  product: (id: string, signal?: AbortSignal) =>
    get<Product>(`/admin/astore/products/${id}`, undefined, signal),
  saveProduct: (body: ProductInput, id?: string) =>
    write<Product>(
      id ? 'patch' : 'post',
      `/admin/astore/products${id ? `/${id}` : ''}`,
      body,
    ),
  saveVariant: (productId: string, body: VariantInput, id?: string) =>
    write<Variant>(
      id ? 'patch' : 'post',
      `/admin/astore/products/${productId}/variants${id ? `/${id}` : ''}`,
      id ? body : { ...body, colorHex: body.colorHex ?? undefined },
    ),
  users: (filters: Filters, signal?: AbortSignal) =>
    get<{ users: UserRow[]; pagination: PaginatedMeta }>(
      '/admin/users',
      filters,
      signal,
    ),
  user: (id: string, signal?: AbortSignal) =>
    get<UserDetail>(`/admin/users/${id}`, undefined, signal),
  setActive: (id: string, active: boolean) =>
    write('patch', `/admin/users/${id}`, { active }),
  revokeModerator: (id: string, reason?: string) =>
    write('post', `/admin/users/${id}/roles/moderator/revoke`, {
      reason: reason?.trim() || undefined,
    }),
  grant: (id: string) =>
    write('post', `/admin/users/${id}/badges`, { badgeType: 'verified' }),
  revoke: (id: string, reason?: string) =>
    write('post', `/admin/users/${id}/badges/verified/revoke`, {
      reason: reason || undefined,
    }),
  requests: (filters: Filters, signal?: AbortSignal) =>
    get<{ requests: BadgeRequest[]; pagination: PaginatedMeta }>(
      '/admin/badge-requests',
      filters,
      signal,
    ),
  review: (id: string, action: 'approve' | 'reject', reason?: string) =>
    write('post', `/admin/badge-requests/${id}/${action}`, {
      reason: reason || undefined,
    }),
}
