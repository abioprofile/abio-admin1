import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLogin, useLogout } from '@/features/auth/hooks/use-auth'
import { errorMessage } from '@/shared/lib/api-error'

export function SignInPage({
  onSignedIn,
  invitation = false,
}: {
  onSignedIn?: () => void
  invitation?: boolean
}) {
  const login = useLogin()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    try {
      await login.mutateAsync({
        email: String(fields.get('email')).trim(),
        password: String(fields.get('password')),
      })
      if (onSignedIn) onSignedIn()
      else await navigate({ to: '/', replace: true })
    } catch {
      /* The mutation renders the server error below. */
    }
  }
  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="brand-mark">a</span>
        <strong>
          abio<span className="muted"> / admin</span>
        </strong>
      </div>
      <section className="login-card">
        {/* <span className="eyebrow">YOUR WORKSPACE</span> */}
        <h1>Welcome back.</h1>
        <p className="muted">
          {invitation
            ? 'Sign in with the invited email to accept your invitation.'
            : 'Sign in to take care of your store.'}
        </p>
        <form onSubmit={submit} className="login-form">
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              required
              autoFocus
            />
          </label>
          <div>
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {login.isError && (
            <p className="notice error" role="alert">
              {errorMessage(login.error)}
            </p>
          )}
          <button className="button primary" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
        <p className="login-note">
          For Abio admins and moderators.
          <br />
          Need access? Contact your administrator.
        </p>
      </section>
      <footer className="login-footer">
        A little less admin. A little more possibility.
      </footer>
    </main>
  )
}

export function AccessDeniedPage() {
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <main className="center-page">
      <section className="login-card">
        <span className="eyebrow">STAFF ACCESS REQUIRED</span>
        <h1>This space is for staff.</h1>
        <p className="muted">
          Your account does not have admin or moderator access. Ask an
          administrator for an invitation, or sign in with another account.
        </p>
        <button
          className="button primary"
          disabled={logout.isPending}
          onClick={async () => {
            try {
              await logout.mutateAsync()
            } catch {
              /* Local session is cleared even offline. */
            }
            await navigate({ to: '/auth/sign-in', replace: true })
          }}
        >
          {logout.isPending ? 'Signing out…' : 'Use another account'}
        </button>
      </section>
    </main>
  )
}
