import { createFileRoute, redirect } from '@tanstack/react-router'

import { hasAccessToken } from '@/shared/lib/auth-tokens'

type SignInSearch = {
  error?: 'forbidden'
}

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    error: search.error === 'forbidden' ? 'forbidden' : undefined,
  }),
  beforeLoad: () => {
    if (hasAccessToken()) {
      throw redirect({ to: '/' })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  const { error } = Route.useSearch()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Auth hooks and API client are wired. Build the login form in Phase 1.
      </p>
      {error === 'forbidden' ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This account does not have staff access.
        </p>
      ) : null}
    </main>
  )
}
