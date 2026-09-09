import { createFileRoute } from '@tanstack/react-router'
import { CreateThemePage } from '@/features/themes/CreateThemePage'
export const Route = createFileRoute('/_staff/themes/new')({
  component: CreateThemePage,
})
