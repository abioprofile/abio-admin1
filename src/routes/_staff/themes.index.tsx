import { createFileRoute } from '@tanstack/react-router'
import { ThemesPage } from '@/features/themes/ThemesPage'
export const Route = createFileRoute('/_staff/themes/')({
  component: ThemesPage,
})
