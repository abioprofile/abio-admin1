import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/query-keys'

import { getCurrentUser, login, logout } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/store/auth-store'
import type { LoginPayload } from '@/features/auth/types'

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      const res = await getCurrentUser()
      return res.data
    },
    enabled: isAuthenticated,
  })
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (res) => {
      setSession(res.data.user, { accessToken: res.data.accessToken, refreshToken: res.data.refreshToken })
      queryClient.setQueryData(queryKeys.user, res.data.user)
    },
  })
}

export function useLogout() {
  const signOut = useAuthStore((s) => s.signOut)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      signOut()
      queryClient.clear()
    },
  })
}
