import { createFileRoute } from '@tanstack/react-router'
import { GiftAccountsPage } from '@/features/gifts/GiftAccountsPage'
export const Route = createFileRoute('/_staff/gifts/')({
  component: GiftAccountsPage,
})
