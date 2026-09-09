import { clearAuthTokens, setAuthTokens } from '@/shared/lib/auth-tokens'

import type { StaffProfile } from '@/features/admin/types'
import type { User } from '@/features/auth/types'

const USER_DATA_KEY = 'auth_user'
const STAFF_DATA_KEY = 'auth_staff'

export function setAuthSession(tokens: { accessToken: string; refreshToken: string }, user: User): void {
  setAuthTokens(tokens.accessToken, tokens.refreshToken)
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
}

export function setStoredUser(user: User): void {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_DATA_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setStoredStaff(staff: StaffProfile): void {
  localStorage.setItem(STAFF_DATA_KEY, JSON.stringify(staff))
}

export function clearStoredStaff(): void {
  localStorage.removeItem(STAFF_DATA_KEY)
}

export function getStoredStaff(): StaffProfile | null {
  const raw = localStorage.getItem(STAFF_DATA_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StaffProfile
  } catch {
    return null
  }
}

export function clearAuthSession(): void {
  clearAuthTokens()
  localStorage.removeItem(USER_DATA_KEY)
  localStorage.removeItem(STAFF_DATA_KEY)
}
