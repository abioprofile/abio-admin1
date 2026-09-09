import { useQuery } from '@tanstack/react-query'
import { Navigate, Link } from '@tanstack/react-router'
import { getMetrics } from '@/features/admin/api/admin.api'
import { queryKeys } from '@/shared/lib/query-keys'
import { errorMessage, errorStatus } from '@/shared/lib/api-error'
import { formatKobo } from '@/shared/lib/money'

const number = (value: number) => value.toLocaleString('en-NG')
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const currency = (amount: number, code: string) =>
  code === 'NGN'
    ? formatKobo(amount)
    : new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: code,
      }).format(amount / 100)

function Breakdown({
  title,
  subtitle,
  values,
}: {
  title: string
  subtitle: string
  values: Record<string, number>
}) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0)
  return (
    <section className="panel breakdown">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="count-pill">{number(total)} total</span>
      </div>
      <div className="breakdown-rows">
        {Object.entries(values).map(([status, count]) => (
          <div className="breakdown-row" key={status}>
            <div>
              <span>{label(status)}</span>
              <strong>{number(count)}</strong>
            </div>
            <div className="bar-track">
              <div
                className={`bar-fill ${status}`}
                style={{ width: `${total ? (count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {total === 0 && (
        <p className="muted empty-caption">
          Activity will appear here as your store grows.
        </p>
      )}
    </section>
  )
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: queryKeys.metrics,
    queryFn: ({ signal }) => getMetrics(signal),
    retry: (count, error) =>
      ![401, 403].includes(errorStatus(error) ?? 0) && count < 1,
  })
  if (errorStatus(query.error) === 403)
    return <Navigate to="/access-denied" replace />
  const data = query.data
  return (
    <main className="dashboard">
      <div className="page-heading">
        <div>
          <span className="eyebrow">AT A GLANCE</span>
          <h1>Store overview</h1>
          <p className="muted">
            A little clarity for your day. Here’s how your store is doing.
          </p>
        </div>
        <button
          className="button refresh"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <span aria-hidden="true">↻</span>
          {query.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <div className="period-row">
        <span className="period-pill">All time</span>
        <span className="muted" aria-live="polite">
          {query.dataUpdatedAt
            ? `Updated ${new Date(query.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Your store, in one place'}
        </span>
      </div>
      {query.isError && (
        <div className="notice error" role="alert">
          {data ? 'Could not refresh. Showing the last loaded data. ' : ''}
          {errorMessage(query.error)}{' '}
          <button className="text-button" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      )}
      {query.isPending && (
        <div className="loading-state" role="status">
          <div className="skeleton-grid">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
          <p className="muted">Loading your store overview…</p>
        </div>
      )}
      {data && (
        <>
          <section className="metrics-grid" aria-label="Key store metrics">
            {[
              {
                name: 'Total revenue',
                value: currency(
                  data.payments.revenueKobo,
                  data.payments.currency,
                ),
                note: 'From successful payments',
                featured: true,
              },
              {
                name: 'Total orders',
                value: number(data.orders.total),
                note: 'Across all order statuses',
              },
              {
                name: 'Successful payments',
                value: number(data.payments.byStatus.success),
                note: 'Confirmed payments',
              },
              {
                name: 'Active products',
                value: number(data.catalog.productsActive),
                note: `${number(data.catalog.productsTotal)} products in your catalog`,
              },
              {
                name: 'Active users',
                value: number(data.users.active),
                note: `${number(data.users.total)} registered users`,
              },
            ].map((metric) => (
              <article
                key={metric.name}
                className={`metric-card ${metric.featured ? 'featured' : ''}`}
              >
                <span>{metric.name}</span>
                <strong>{metric.value}</strong>
                <p>{metric.note}</p>
              </article>
            ))}
          </section>
          <div className="breakdown-grid">
            <Breakdown
              title="Order activity"
              subtitle="Where your orders stand"
              values={data.orders.byStatus}
            />
            <Breakdown
              title="Payments"
              subtitle="A breakdown of payment outcomes"
              values={data.payments.byStatus}
            />
          </div>
          <section className="panel recent-orders">
            <div className="panel-heading">
              <div>
                <h2>Recent orders</h2>
                <p>The latest orders across your store</p>
              </div>
              <span className="count-pill">
                Latest {data.recentOrders.length}
              </span>
            </div>
            {data.recentOrders.length ? (
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">
                    Latest store orders with customer, date, payment status,
                    order status and total
                  </caption>
                  <thead>
                    <tr>
                      <th>Order / Customer</th>
                      <th>Date</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th className="align-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <div className="customer-cell">
                            <span className="avatar small">
                              {order.user.name?.slice(0, 1).toUpperCase() ||
                                'U'}
                            </span>
                            <div>
                              <strong>
                                {order.user.name || order.user.email}
                              </strong>
                              <span>{order.user.email}</span>
                              <Link to="/orders/$id" params={{ id: order.id }}>
                                <code title={order.id}>
                                  #{order.id.slice(0, 8)}
                                </code>
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="date-cell">
                          {new Date(order.createdAt).toLocaleDateString(
                            'en-GB',
                            { day: 'numeric', month: 'short', year: 'numeric' },
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${order.payment?.status ?? 'unknown'}`}
                          >
                            {order.payment
                              ? label(order.payment.status)
                              : 'No payment'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${order.status}`}>
                            {label(order.status)}
                          </span>
                        </td>
                        <td className="align-right amount">
                          {currency(order.totalAmountKobo, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-orders">
                <span aria-hidden="true">▤</span>
                <h3>Your first order starts the story.</h3>
                <p>New orders will appear here when customers check out.</p>
              </div>
            )}
          </section>
          <footer className="dashboard-footer">
            Abio Admin <span>Made for the everyday details.</span>
          </footer>
        </>
      )}
    </main>
  )
}
