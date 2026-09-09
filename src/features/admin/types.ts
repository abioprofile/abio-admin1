export type StaffRole = 'admin' | 'moderator'

export interface StaffProfile {
  id: string
  email: string
  name: string
  roles: string[]
}

export type OrderStatus = 'processing' | 'ready' | 'shipped' | 'received' | 'cancelled'

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'reversed'

export type ProductType = 'standard' | 'custom'

export const STAFF_ROLES: StaffRole[] = ['admin', 'moderator']

export function isStaffRole(role: string): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole)
}

export function isStaffMember(staff: StaffProfile | null | undefined): boolean {
  if (!staff) return false
  return staff.roles.some(isStaffRole)
}

export function isAdmin(staff: StaffProfile | null | undefined): boolean {
  return Boolean(staff?.roles.includes('admin'))
}
