import { apiClient } from '@/shared/lib/api-client'
import type { ApiResponse, PaginatedMeta } from '@/shared/types'
import type { OrderStatus, PaymentStatus } from '@/features/admin/types'
export const orderStatuses: OrderStatus[] = [
  'processing',
  'ready',
  'shipped',
  'received',
  'cancelled',
]
export const paymentStatuses: PaymentStatus[] = [
  'pending',
  'success',
  'failed',
  'reversed',
]
export interface OrderItem {
  id: string
  quantity: number
  unitPriceKobo: number
  productName?: string
  productSlug?: string
  productType?: 'standard' | 'custom' | null
  variantColorName?: string | null
  variantColorHex?: string | null
  imageUrls?: string[]
  customUsername: string | null
  preferredColor: string | null
  instructions: string | null
  artworkUrl: string | null
  product: {
    id: string
    name: string
    slug: string
    type: 'standard' | 'custom'
  } | null
  variant: {
    id: string
    colorName: string
    colorHex: string | null
    imageUrls: string[]
  } | null
}
export interface Order {
  id: string
  status: OrderStatus
  totalAmountKobo: number
  subtotalKobo?: number
  shippingFeeKobo?: number
  currency: string
  deliveryZone: 'lagos' | 'outside_lagos' | null
  shippingAddress: string | null
  trackingNumber: string | null
  createdAt: string
  updatedAt: string
  items: OrderItem[]
  user: { id: string; name: string; email: string }
  payment: {
    id: string
    status: PaymentStatus
    provider: string
    providerRef: string | null
    amountKobo: number
    currency: string
    paidAt: string | null
    failedAt: string | null
    createdAt: string
  } | null
}
export interface OrderUpdate {
  status?: OrderStatus
  trackingNumber?: string | null
}
export async function listOrders(
  filters: Record<string, string | number | undefined>,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<
    ApiResponse<{ orders: Order[]; pagination: PaginatedMeta }>
  >('/admin/astore/orders', { params: filters, signal })
  return data.data
}
export async function getOrder(id: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<ApiResponse<Order>>(
    `/admin/astore/orders/${id}`,
    { signal },
  )
  return data.data
}
export async function updateOrder(id: string, body: OrderUpdate) {
  const { data } = await apiClient.patch<ApiResponse<Order>>(
    `/admin/astore/orders/${id}`,
    body,
  )
  return data.data
}
export function nextStatus(order: Order): OrderStatus | undefined {
  if (order.payment?.status !== 'success') return undefined
  return (
    { processing: 'ready', ready: 'shipped', shipped: 'received' } as Partial<
      Record<OrderStatus, OrderStatus>
    >
  )[order.status]
}
export function canCancel(order: Order) {
  return (
    ['processing', 'ready'].includes(order.status) &&
    order.payment?.status !== 'success' &&
    order.payment?.status !== 'reversed'
  )
}
