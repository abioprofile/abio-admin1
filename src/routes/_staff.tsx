import { createFileRoute } from '@tanstack/react-router'
import { ensureStaffAccess } from '@/features/admin/lib/staff-guard'
import { AdminShell, AccessError } from '@/features/admin/components/AdminShell'
export const Route = createFileRoute('/_staff')({
  beforeLoad: ensureStaffAccess,
  component: AdminShell,
  pendingComponent: () => (
    <main className="center-page" role="status">
      Checking staff access…
    </main>
  ),
  errorComponent: AccessError,
})
