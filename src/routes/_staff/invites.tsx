import { createFileRoute } from '@tanstack/react-router'
import { InvitesPage } from '@/features/invites/InvitesPage'
export const Route = createFileRoute('/_staff/invites')({
  component: InvitesPage,
})
