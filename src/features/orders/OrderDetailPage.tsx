import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  getOrder,
  updateOrder,
  nextStatus,
  canCancel,
  type Order,
  type OrderItem,
  type OrderUpdate,
} from './orders.api'
import type { OrderStatus } from '@/features/admin/types'
import {
  PageTitle,
  LoadingError,
  Feedback,
  Modal,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { safeUrl, date } from '@/shared/lib/display'
import { formatKobo } from '@/shared/lib/money'

function Item({ item }: { item: OrderItem }) {
  // Empty names identify pre-snapshot orders. Empty snapshot images are intentional.
  const snapshot = Boolean(item.productName)
  const name = item.productName || item.product?.name || 'Product unavailable'
  const color = snapshot ? item.variantColorName : item.variant?.colorName
  const images = snapshot
    ? (item.imageUrls ?? [])
    : (item.variant?.imageUrls ?? [])
  const type = item.productType ?? item.product?.type
  return (
    <article className="order-item">
      <div className="product-thumb">
        {safeUrl(images[0]) ? (
          <img src={safeUrl(images[0])} alt="" />
        ) : (
          <Icon name="products" />
        )}
      </div>
      <div className="order-item-content">
        <h3>{name}</h3>
        <p className="muted">
          {type === 'custom' ? 'Custom · Made to order' : color || 'Standard'} ·
          Qty {item.quantity} × {formatKobo(item.unitPriceKobo)}
        </p>
        {(item.productSlug || item.product?.slug) && (
          <p className="muted">/{item.productSlug || item.product?.slug}</p>
        )}
        {item.customUsername && (
          <p>
            Username: <strong>{item.customUsername}</strong>
          </p>
        )}
        {item.preferredColor && <p>Preferred color: {item.preferredColor}</p>}
        {item.instructions && (
          <p className="preserve-text">{item.instructions}</p>
        )}
        {safeUrl(item.artworkUrl) && (
          <a
            className="back-link"
            href={safeUrl(item.artworkUrl)}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
          >
            <Icon name="external" size={14} />
            Open artwork
          </a>
        )}
      </div>
      <strong className="order-item-total">
        {formatKobo(item.unitPriceKobo * item.quantity)}
      </strong>
    </article>
  )
}
export function OrderDetailPage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: ({ signal }) => getOrder(id, signal),
  })
  return (
    <main className="dashboard">
      <Link className="back-link" to="/orders">
        <Icon name="arrow" size={16} />
        All orders
      </Link>
      <LoadingError
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <OrderView
          order={query.data}
          refreshing={query.isFetching}
          refresh={() => void query.refetch()}
        />
      )}
    </main>
  )
}
function OrderView({
  order,
  refreshing,
  refresh,
}: {
  order: Order
  refreshing: boolean
  refresh: () => void
}) {
  const client = useQueryClient()
  const [action, setAction] = useState<OrderStatus | null>(null)
  const [success, setSuccess] = useState('')
  const next = nextStatus(order)
  const cancel = canCancel(order)
  const mutation = useMutation({
    mutationFn: (body: OrderUpdate) => updateOrder(order.id, body),
    onSuccess: async (updated) => {
      client.setQueryData(['admin', 'order', order.id], updated)
      setAction(null)
      setSuccess('Order updated successfully.')
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'order', order.id] })
    },
  })
  function choose(status: OrderStatus) {
    mutation.reset()
    setSuccess('')
    setAction(status)
  }
  const actionAllowed = action === 'cancelled' ? cancel : action === next
  const itemSubtotal = order.items.reduce(
    (sum, item) => sum + item.unitPriceKobo * item.quantity,
    0,
  )
  // Legacy rows have default-zero subtotals; line prices are still historical snapshots.
  const subtotal = order.subtotalKobo || itemSubtotal
  return (
    <>
      <PageTitle
        title={`Order #${order.id.slice(0, 8)}`}
        description={`Placed ${date(order.createdAt)} · ${order.user.name || order.user.email}`}
        action={
          <button
            className="button"
            disabled={refreshing || mutation.isPending}
            onClick={refresh}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />
      <Feedback success={success} />
      {!action && <Feedback error={mutation.error} />}
      <div className="order-meta">
        <span className={`badge ${order.status}`}>{order.status}</span>
        <span className={`badge ${order.payment?.status ?? ''}`}>
          Payment: {order.payment?.status ?? 'not recorded'}
        </span>
        <code>{order.id}</code>
      </div>
      <div className="order-layout">
        <div className="stack">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Order items</h2>
                <p>The products and custom details recorded at checkout.</p>
              </div>
              <span className="count-pill">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                items
              </span>
            </div>
            <div className="order-items">
              {order.items.map((item) => (
                <Item key={item.id} item={item} />
              ))}
            </div>
            <dl className="order-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatKobo(subtotal)}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>
                  {formatKobo(
                    order.shippingFeeKobo ??
                      Math.max(0, order.totalAmountKobo - itemSubtotal),
                  )}
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatKobo(order.totalAmountKobo)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel detail-panel">
            <h2>Fulfillment</h2>
            <p className="muted">
              {order.status === 'cancelled'
                ? 'This order is cancelled and cannot move forward.'
                : order.status === 'received'
                  ? 'This order has been received. Fulfillment is complete.'
                  : order.payment?.status === 'success'
                    ? 'Move the order to its next stage when it is ready.'
                    : 'Fulfillment is available after payment is confirmed.'}
            </p>
            <div className="fulfillment-steps" aria-label="Fulfillment stages">
              {(['processing', 'ready', 'shipped', 'received'] as const).map(
                (status) => (
                  <span
                    key={status}
                    className={order.status === status ? 'current' : ''}
                  >
                    {status}
                  </span>
                ),
              )}
            </div>
            <div className="form-actions">
              {cancel && (
                <button
                  className="button danger"
                  disabled={refreshing || mutation.isPending}
                  onClick={() => choose('cancelled')}
                >
                  Cancel order
                </button>
              )}
              {next && (
                <button
                  className="button primary"
                  disabled={refreshing || mutation.isPending}
                  onClick={() => choose(next)}
                >
                  Mark as {next}
                </button>
              )}
            </div>
            {['success', 'reversed'].includes(order.payment?.status ?? '') &&
              ['processing', 'ready'].includes(order.status) && (
                <p className="muted">
                  Paid orders cannot be cancelled until refunds are supported.
                </p>
              )}
          </section>
        </div>
        <div className="stack">
          <section className="panel detail-panel">
            <h2>Customer & delivery</h2>
            <dl className="detail-list">
              <div>
                <dt>Customer</dt>
                <dd>
                  <Link
                    className="row-link"
                    to="/users/$id"
                    params={{ id: order.user.id }}
                  >
                    {order.user.name || 'View user'}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{order.user.email}</dd>
              </div>
              <div>
                <dt>Zone</dt>
                <dd>
                  {order.deliveryZone === 'lagos'
                    ? 'Lagos'
                    : order.deliveryZone === 'outside_lagos'
                      ? 'Outside Lagos'
                      : 'Not recorded'}
                </dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{order.shippingAddress || 'Not recorded'}</dd>
              </div>
            </dl>
          </section>
          <Tracking
            key={`${order.id}:${order.trackingNumber}`}
            order={order}
            onSaved={() => setSuccess('Tracking saved.')}
          />
          <section className="panel detail-panel">
            <h2>Payment</h2>
            <dl className="detail-list">
              <div>
                <dt>Status</dt>
                <dd>{order.payment?.status ?? 'No payment record'}</dd>
              </div>
              {order.payment && (
                <>
                  <div>
                    <dt>Amount</dt>
                    <dd>{formatKobo(order.payment.amountKobo)}</dd>
                  </div>
                  <div>
                    <dt>Provider</dt>
                    <dd>{order.payment.provider}</dd>
                  </div>
                  <div>
                    <dt>Reference</dt>
                    <dd>{order.payment.providerRef || 'Not assigned'}</dd>
                  </div>
                  {order.payment.paidAt && (
                    <div>
                      <dt>Paid</dt>
                      <dd>{date(order.payment.paidAt)}</dd>
                    </div>
                  )}
                  {order.payment.failedAt && (
                    <div>
                      <dt>Failed</dt>
                      <dd>{date(order.payment.failedAt)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </section>
        </div>
      </div>
      {action && (
        <Modal
          title={
            action === 'cancelled' ? 'Cancel order' : `Mark order as ${action}`
          }
          onClose={() => setAction(null)}
          busy={mutation.isPending}
        >
          <div className="editor-form">
            <p className="muted">
              {action === 'cancelled'
                ? 'Cancel this unpaid order? The backend will release eligible reserved stock. This cannot be undone.'
                : `Move this order from ${order.status} to ${action}?`}
            </p>
            <Feedback error={mutation.error} />
            {!actionAllowed && (
              <p className="notice error" role="alert">
                This order has changed. Close this dialog and review its latest
                status.
              </p>
            )}
            <div className="form-actions">
              <button
                className="button"
                disabled={mutation.isPending}
                onClick={() => setAction(null)}
              >
                Go back
              </button>
              <button
                className={`button ${action === 'cancelled' ? 'danger' : 'primary'}`}
                disabled={mutation.isPending || refreshing || !actionAllowed}
                onClick={() => mutation.mutate({ status: action })}
              >
                {mutation.isPending
                  ? 'Saving…'
                  : action === 'cancelled'
                    ? 'Confirm cancellation'
                    : 'Confirm status change'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
function Tracking({ order, onSaved }: { order: Order; onSaved: () => void }) {
  const [tracking, setTracking] = useState(order.trackingNumber ?? '')
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      updateOrder(order.id, { trackingNumber: tracking.trim() || null }),
    onSuccess: async (updated) => {
      onSaved()
      client.setQueryData(['admin', 'order', order.id], updated)
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  return (
    <section className="panel detail-panel">
      <h2>Tracking</h2>
      <p className="muted">Tracking details are visible to the customer.</p>
      <form
        className="tracking-form"
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
      >
        <label>
          Tracking number
          <input
            maxLength={120}
            value={tracking}
            onChange={(e) => {
              setTracking(e.target.value)
            }}
            placeholder="Enter a tracking number"
            disabled={mutation.isPending}
          />
        </label>
        <small className="muted">Leave blank to remove tracking.</small>
        <Feedback error={mutation.error} />
        <button
          className="button"
          disabled={
            mutation.isPending ||
            tracking.trim() === (order.trackingNumber ?? '')
          }
        >
          {mutation.isPending ? 'Saving…' : 'Save tracking'}
        </button>
      </form>
    </section>
  )
}
