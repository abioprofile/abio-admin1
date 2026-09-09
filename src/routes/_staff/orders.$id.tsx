import { createFileRoute } from '@tanstack/react-router'
import { OrderDetailPage } from '@/features/orders/OrderDetailPage'
export const Route = createFileRoute('/_staff/orders/$id')({
  component: function OrderRoute() {
    const { id } = Route.useParams()
    return <OrderDetailPage key={id} id={id} />
  },
})
