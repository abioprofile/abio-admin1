import { createFileRoute } from '@tanstack/react-router'
import { ProductsPage } from '@/features/catalog/ProductsPage'
export const Route = createFileRoute('/_staff/products/')({
  component: ProductsPage,
})
