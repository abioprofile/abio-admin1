import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/admin/components/DashboardPage'
export const Route = createFileRoute('/_staff/')({ component: DashboardPage })
