import { redirect } from '@tanstack/react-router'
import { getAdminMe } from '@/features/admin/api/admin.api'
import { isStaffMember } from '@/features/admin/types'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { errorStatus } from '@/shared/lib/api-error'

export async function ensureStaffAccess() {
  let staff
  try {
    staff = (await getAdminMe()).data
  } catch (error) {
    if (errorStatus(error) === 401) throw redirect({ to: '/auth/sign-in' })
    if (errorStatus(error) === 403) {
      useAuthStore.getState().setStaff(null)
      throw redirect({ to: '/access-denied' })
    }
    throw error
  }
  if (!isStaffMember(staff)) {
    useAuthStore.getState().setStaff(null)
    throw redirect({ to: '/access-denied' })
  }
  useAuthStore.getState().setStaff(staff)
  return { staff }
}
