import { createFileRoute } from '@tanstack/react-router'
import { UserDetailPage } from '@/features/users/UserDetailPage'
export const Route = createFileRoute('/_staff/users/$id')({
  component: function DetailRoute() {
    const { id } = Route.useParams()
    return <UserDetailPage key={id} id={id} />
  },
})
