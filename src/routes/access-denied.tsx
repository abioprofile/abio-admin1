import { createFileRoute } from '@tanstack/react-router'
import { AccessDeniedPage } from '@/features/auth/components/SignInPage'
export const Route = createFileRoute('/access-denied')({
  component: AccessDeniedPage,
})
