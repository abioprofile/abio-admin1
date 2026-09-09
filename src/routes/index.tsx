import { createFileRoute } from '@tanstack/react-router'

import { ensureStaffAccess } from '@/features/admin/lib/staff-guard'
import { useStaffProfile } from '@/features/auth/store/auth-store'

export const Route = createFileRoute('/')({
  beforeLoad: () => ensureStaffAccess(),
  component: AdminHomePage,
})

function AdminHomePage() {
  const staff = useStaffProfile()

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Abio Admin</p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground">Bootstrap ready</h1>
      <p className="mt-3 text-muted-foreground">
        Signed in as {staff?.name ?? 'staff'} ({staff?.roles.join(', ') ?? 'loading roles…'})
      </p>
    </main>
  )
}
