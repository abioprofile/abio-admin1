export const queryKeys = {
  user: ['user'] as const,
  adminMe: ['admin', 'me'] as const,
  metrics: ['admin', 'metrics'] as const,
  products: (filters?: Record<string, unknown>) => ['admin', 'products', filters] as const,
  product: (id: string) => ['admin', 'product', id] as const,
  orders: (filters?: Record<string, unknown>) => ['admin', 'orders', filters] as const,
  order: (id: string) => ['admin', 'order', id] as const,
  users: (filters?: Record<string, unknown>) => ['admin', 'users', filters] as const,
  invites: ['admin', 'invites'] as const,
  giftAccounts: (filters?: Record<string, unknown>) => ['admin', 'gift-accounts', filters] as const,
  giftAccount: (id: string) => ['admin', 'gift-account', id] as const,
  badgeRequests: (filters?: Record<string, unknown>) => ['admin', 'badge-requests', filters] as const,
}
