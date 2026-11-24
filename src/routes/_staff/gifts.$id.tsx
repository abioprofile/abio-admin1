import { createFileRoute } from '@tanstack/react-router'
import { GiftAccountDetailPage } from '@/features/gifts/GiftAccountDetailPage'
export const Route = createFileRoute('/_staff/gifts/$id')({
  component: function DetailRoute() {
    const { id } = Route.useParams()
    return <GiftAccountDetailPage key={id} id={id} />
  },
})
