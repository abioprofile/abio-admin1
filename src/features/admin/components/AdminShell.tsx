import { Icon } from '@/shared/components/Icon'
import { useState } from 'react'
import {
  Link,
  Navigate,
  Outlet,
  useNavigate,
  useRouter,
  useLocation,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { useStaffProfile } from '@/features/auth/store/auth-store'
import { useLogout } from '@/features/auth/hooks/use-auth'
import { errorMessage } from '@/shared/lib/api-error'

export function AdminShell() {
  const path = useLocation({ select: (location) => location.pathname })
  const section = path.startsWith('/products')
    ? 'Products'
    : path.startsWith('/users')
      ? 'Users'
      : path.startsWith('/verification')
        ? 'Verification'
        : path.startsWith('/themes')
          ? 'Themes'
          : path.startsWith('/orders')
            ? 'Orders'
            : path.startsWith('/invites')
              ? 'Invitations'
              : 'Overview'
  const staff = useStaffProfile()
  const logout = useLogout()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  if (!staff) return <Navigate to="/auth/sign-in" replace />
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link to="/" className="brand">
            <span className="brand-mark">a</span>abio
            <span className="admin-label">ADMIN</span>
          </Link>
          <button
            className="menu-toggle button"
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            <Icon name={open ? 'close' : 'menu'} size={17} />
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
        <div
          id="main-navigation"
          className={`sidebar-content ${open ? 'is-open' : ''}`}
        >
          <p className="nav-caption">WORKSPACE</p>
          <nav aria-label="Main navigation">
            {(
              [
                {
                  to: '/',
                  label: path.startsWith('/orders')
                    ? 'Orders'
                    : path.startsWith('/invites')
                      ? 'Invitations'
                      : 'Overview',
                  icon: 'overview',
                },
                { to: '/products', label: 'Products', icon: 'products' },
                { to: '/orders', label: 'Orders', icon: 'orders' },
                { to: '/themes', label: 'Themes', icon: 'themes' },
                { to: '/users', label: 'Users', icon: 'users' },
                {
                  to: '/verification',
                  label: 'Verification',
                  icon: 'verification',
                },
              ] as const
            ).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-item ${section === item.label ? 'active' : ''}`}
                aria-current={section === item.label ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
            {staff.roles.includes('admin') && (
              <Link
                to="/invites"
                className={`nav-item ${section === 'Invitations' ? 'active' : ''}`}
                aria-current={section === 'Invitations' ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon name="invites" />
                Invitations
              </Link>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="workspace-note">
              <span className="status-dot" /> Abio workspace
              <p>A clear view of your store.</p>
            </div>
            <div className="staff-profile">
              <span className="avatar">
                {staff.name?.slice(0, 1).toUpperCase() || 'A'}
              </span>
              <div>
                <strong>{staff.name}</strong>
                <span>
                  {staff.roles.includes('admin')
                    ? 'Administrator'
                    : 'Moderator'}
                </span>
              </div>
            </div>
            <button
              className="sign-out"
              disabled={logout.isPending}
              onClick={async () => {
                try {
                  await logout.mutateAsync()
                } catch {
                  /* Cleared by onSettled. */
                }
                await navigate({ to: '/auth/sign-in', replace: true })
              }}
            >
              <Icon name="logout" size={16} />
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span>
            Workspace <span className="breadcrumb">/</span>{' '}
            <strong>{section}</strong>
          </span>
          <span className="staff-tag">Staff workspace</span>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export function AccessError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="center-page">
      <section className="login-card">
        <span className="eyebrow">CONNECTION INTERRUPTED</span>
        <h1>Let’s try that again.</h1>
        <p role="alert" className="muted">
          {errorMessage(error)}
        </p>
        <button
          className="button primary"
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          Retry connection
        </button>
        <Link className="text-link" to="/auth/sign-in">
          Back to sign in
        </Link>
      </section>
    </main>
  )
}
