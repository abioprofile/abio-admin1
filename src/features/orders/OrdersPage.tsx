import { useDebounce } from '@/shared/hooks/useDebounce'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { listOrders, orderStatuses, paymentStatuses } from './orders.api'
import {
  PageTitle,
  LoadingError,
  Pagination,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { date } from '@/shared/lib/display'
import { formatKobo } from '@/shared/lib/money'
export function OrdersPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    page: 1,
    q: '',
    status: '',
    paymentStatus: '',
  })
  const q = useDebounce(search.trim())
  if (q !== filters.q) setFilters({ ...filters, q, page: 1 })
  const query = useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: ({ signal }) =>
      listOrders(
        {
          ...filters,
          q: filters.q || undefined,
          status: filters.status || undefined,
          paymentStatus: filters.paymentStatus || undefined,
        },
        signal,
      ),
  })
  return (
    <main className="dashboard">
      <PageTitle
        title="Orders"
        description="From checkout to delivery. Keep every order moving."
        action={
          <button
            className="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search orders"
            placeholder="Buyer, full order ID, or tracking"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Order status"
          value={filters.status}
          onChange={(e) =>
            setFilters({ ...filters, page: 1, status: e.target.value })
          }
        >
          <option value="">All order statuses</option>
          {orderStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select
          aria-label="Payment status"
          value={filters.paymentStatus}
          onChange={(e) =>
            setFilters({ ...filters, page: 1, paymentStatus: e.target.value })
          }
        >
          <option value="">All payment statuses</option>
          {paymentStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <LoadingError
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <section className="panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order / Buyer</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        className="row-link"
                        to="/orders/$id"
                        params={{ id: order.id }}
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                      <p className="muted">
                        {order.user.name} · {order.user.email}
                      </p>
                    </td>
                    <td>{date(order.createdAt)}</td>
                    <td>
                      <span className={`badge ${order.payment?.status ?? ''}`}>
                        {order.payment?.status ?? 'No payment'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{formatKobo(order.totalAmountKobo)}</td>
                    <td>
                      <Link
                        className="button"
                        to="/orders/$id"
                        params={{ id: order.id }}
                      >
                        View order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.orders.length === 0 && (
            <div className="empty-orders">
              <Icon name="orders" size={30} />
              <h3>No orders found.</h3>
              <p>New orders will appear here. Try adjusting your filters.</p>
            </div>
          )}
          <Pagination
            meta={query.data.pagination}
            onPage={(page) => setFilters({ ...filters, page })}
            fetching={query.isFetching}
          />
        </section>
      )}
    </main>
  )
}
