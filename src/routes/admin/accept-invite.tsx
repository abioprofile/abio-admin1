import { createFileRoute } from '@tanstack/react-router'
import { AcceptInvitePage } from '@/features/invites/AcceptInvitePage'
export const Route = createFileRoute('/admin/accept-invite')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token.trim() : '',
  }),
  component: function AcceptanceRoute() {
    const { token } = Route.useSearch()
    return <AcceptInvitePage key={token} token={token} />
  },
})
