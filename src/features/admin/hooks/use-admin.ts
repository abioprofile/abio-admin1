import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/lib/query-keys'

import { getAdminMe } from '@/features/admin/api/admin.api'
import { isStaffMember } from '@/features/admin/types'
import { useAuthStore } from '@/features/auth/store/auth-store'

export function useAdminMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setStaff = useAuthStore((s) => s.setStaff)

  return useQuery({
    queryKey: queryKeys.adminMe,
    queryFn: async () => {
      const res = await getAdminMe()
      setStaff(res.data)
      return res.data
    },
    enabled: isAuthenticated,
    retry: false,
  })
}

export function useStaffGate() {
  const { data, isLoading, isError, error, isFetching } = useAdminMe()

  return {
    staff: data ?? null,
    isStaff: isStaffMember(data),
    isLoading: isLoading || isFetching,
    isForbidden: isError,
    error,
  }
}
