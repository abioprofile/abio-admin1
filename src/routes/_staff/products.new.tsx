import { createFileRoute } from '@tanstack/react-router'
import { ProductEditor } from '@/features/catalog/ProductEditor'
export const Route = createFileRoute('/_staff/products/new')({
  component: ProductEditor,
})
