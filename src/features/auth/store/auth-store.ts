import { create } from 'zustand'

import type { StaffProfile } from '@/features/admin/types'
import type { AuthTokens, User } from '@/features/auth/types'

import {
  clearAuthSession,
  clearStoredStaff,
  getStoredStaff,
  getStoredUser,
  setAuthSession,
  setStoredStaff,
  setStoredUser,
} from './auth-storage'

interface AuthState {
  user: User | null
  staff: StaffProfile | null
  isAuthenticated: boolean
  setSession: (user: User, tokens: AuthTokens) => void
  setStaff: (staff: StaffProfile | null) => void
  setUser: (user: User) => void
  signOut: () => void
  hydrateFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  staff: getStoredStaff(),
  isAuthenticated: Boolean(getStoredUser()),

  setSession: (user, tokens) => {
    setAuthSession(tokens, user)
    set({ user, isAuthenticated: true })
  },

  setStaff: (staff) => {
    if (staff) {
      setStoredStaff(staff)
    } else {
      clearStoredStaff()
    }
    set({ staff })
  },

  setUser: (user) => {
    set((state) => {
      if (state.isAuthenticated) {
        setStoredUser(user)
      }
      return { user }
    })
  },

  signOut: () => {
    clearAuthSession()
    set({ user: null, staff: null, isAuthenticated: false })
  },

  hydrateFromStorage: () => {
    const user = getStoredUser()
    const staff = getStoredStaff()
    set({ user, staff, isAuthenticated: Boolean(user) })
  },
}))

export const useAuthUser = () => useAuthStore((s) => s.user)
export const useStaffProfile = () => useAuthStore((s) => s.staff)
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated)
