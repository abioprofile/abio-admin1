import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { SignInPage } from '@/features/auth/components/SignInPage'
import { useLogout } from '@/features/auth/hooks/use-auth'
import { acceptInvite } from './invites.api'
import { Feedback } from '@/shared/components/Management'
export function AcceptInvitePage({ token }: { token: string }) {
  const authenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const client = useQueryClient()
  const logout = useLogout()
  const [accepted, setAccepted] = useState(false)
  const mutation = useMutation({
    mutationFn: () => acceptInvite(token),
    gcTime: 0,
    onSuccess: async () => {
      setAccepted(true)
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  if (!token)
    return (
      <main className="center-page">
        <section className="login-card">
          <h1>Invitation link missing.</h1>
          <p className="muted">
            Open the complete link shared by your administrator.
          </p>
          <Link className="text-link" to="/auth/sign-in">
            Sign in
          </Link>
        </section>
      </main>
    )
  if (!authenticated && !accepted)
    return <SignInPage onSignedIn={() => {}} invitation />
  return (
    <main className="center-page">
      <section className="login-card">
        <span className="eyebrow">ABIO WORKSPACE</span>
        <h1>{accepted ? 'You’re on the team.' : 'Join as a moderator'}</h1>
        {accepted ? (
          <>
            <p className="muted">
              Your invitation was accepted. You can now open the staff
              workspace.
            </p>
            <Link className="button primary" to="/" replace>
              Open workspace
            </Link>
          </>
        ) : (
          <>
            <p className="muted">
              Signed in as <strong>{user?.email}</strong>. This must match the
              email on the invitation.
            </p>
            <Feedback error={mutation.error} />
            <button
              className="button primary"
              disabled={mutation.isPending || logout.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Accepting…' : 'Accept invitation'}
            </button>
            <button
              className="text-button text-link"
              disabled={mutation.isPending || logout.isPending}
              onClick={async () => {
                try {
                  await logout.mutateAsync()
                } catch {
                  /* Local session is cleared. */
                }
                mutation.reset()
              }}
            >
              Use another account
            </button>
            <p className="login-note">
              Expired or already used links cannot be accepted again. Ask your
              administrator for a new invitation if needed.
            </p>
          </>
        )}
      </section>
    </main>
  )
}
