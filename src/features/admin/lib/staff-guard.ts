import { redirect } from '@tanstack/react-router'

import { getAdminMe } from '@/features/admin/api/admin.api'
import { isStaffMember } from '@/features/admin/types'
import { queryClient } from '@/shared/lib/query-client'
import { queryKeys } from '@/shared/lib/query-keys'
import { hasAccessToken } from '@/shared/lib/auth-tokens'

export async function ensureStaffAccess() {
  if (!hasAccessToken()) {
    throw redirect({ to: '/auth/sign-in' })
  }

  try {
    const staff = await queryClient.ensureQueryData({
      queryKey: queryKeys.adminMe,
      queryFn: async () => {
        const res = await getAdminMe()
        return res.data
      },
    })

    if (!isStaffMember(staff)) {
      throw redirect({ to: '/auth/sign-in', search: { error: 'forbidden' } })
    }

    return staff
  } catch (error) {
    if (error && typeof error === 'object' && 'isRedirect' in error) {
      throw error
    }

    throw redirect({ to: '/auth/sign-in' })
  }
}
