import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
export const Route = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: () => (
    <main className="center-page">
      <section className="login-card">
        <h1>Page not found.</h1>
        <p className="muted">This page isn’t part of your workspace.</p>
        <Link className="text-link" to="/">
          Back to overview
        </Link>
      </section>
    </main>
  ),
})
