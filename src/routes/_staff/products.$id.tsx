import { createFileRoute } from '@tanstack/react-router'
import { ProductEditor } from '@/features/catalog/ProductEditor'
export const Route = createFileRoute('/_staff/products/$id')({
  component: function DetailRoute() {
    const { id } = Route.useParams()
    return <ProductEditor key={id} id={id} />
  },
})
