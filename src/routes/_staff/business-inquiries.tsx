import { createFileRoute } from '@tanstack/react-router'
import { BusinessInquiriesPage } from '@/features/business/BusinessInquiriesPage'
export const Route = createFileRoute('/_staff/business-inquiries')({
  component: BusinessInquiriesPage,
})
