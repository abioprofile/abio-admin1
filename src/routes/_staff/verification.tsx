import { createFileRoute } from '@tanstack/react-router'
import { VerificationPage } from '@/features/verification/VerificationPage'
export const Route = createFileRoute('/_staff/verification')({
  component: VerificationPage,
})
