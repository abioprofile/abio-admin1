import { safeUrl, date } from '@/shared/lib/display'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  management,
  type BadgeRequest,
} from '@/features/admin/api/management.api'
import {
  PageTitle,
  LoadingError,
  Feedback,
  Modal,
  Pagination,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
export function VerificationPage() {
  const client = useQueryClient()
  const [filters, setFilters] = useState({ page: 1, status: 'pending' })
  const [selected, setSelected] = useState<BadgeRequest | null>(null)
  const [reason, setReason] = useState('')
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [success, setSuccess] = useState('')
  const query = useQuery({
    queryKey: ['admin', 'badge-requests', filters],
    queryFn: ({ signal }) =>
      management.requests(
        { ...filters, status: filters.status || undefined },
        signal,
      ),
  })
  const mutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      management.review(selected!.id, action, reason.trim()),
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ['admin'] })
      setSelected(null)
      setSuccess(
        action === 'approve'
          ? 'Request approved. The user is now verified.'
          : 'Request rejected.',
      )
      if (query.data?.requests.length === 1 && filters.page > 1)
        setFilters({ ...filters, page: filters.page - 1 })
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'badge-requests'] })
    },
  })
  // Prefer a refreshed row after another reviewer changes this request.
  const request =
    query.data?.requests.find((row) => row.id === selected?.id) ?? selected
  return (
    <main className="dashboard">
      <PageTitle
        title="Verification"
        description="Review requests and help your community build trust."
      />
      <Feedback success={success} />
      <div className="toolbar">
        <label className="filter-label">
          Request status
          <select
            value={filters.status}
            onChange={(e) => setFilters({ page: 1, status: e.target.value })}
          >
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All requests</option>
          </select>
        </label>
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
                  <th>Applicant</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.requests.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        className="row-link"
                        to="/users/$id"
                        params={{ id: row.userId }}
                      >
                        {row.user.name || row.user.email}
                      </Link>
                      <p className="muted">{row.user.email}</p>
                    </td>
                    <td>{date(row.createdAt)}</td>
                    <td>
                      <span
                        className={`badge ${row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'failed' : 'pending'}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button"
                        onClick={() => {
                          setSelected(row)
                          setDecision(null)
                          setReason('')
                          setSuccess('')
                          mutation.reset()
                        }}
                      >
                        {row.status === 'pending'
                          ? 'Review request'
                          : 'View request'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.requests.length && (
            <div className="empty-orders">
              <Icon name="verification" size={30} />
              <h3>
                {filters.status === 'pending'
                  ? 'You’re all caught up.'
                  : 'No requests found.'}
              </h3>
              <p>
                {filters.status === 'pending'
                  ? 'New verification requests will appear here.'
                  : 'Try another status filter.'}
              </p>
            </div>
          )}
          <Pagination
            meta={query.data.pagination}
            onPage={(page) => setFilters({ ...filters, page })}
            fetching={query.isFetching}
          />
        </section>
      )}
      {request && (
        <Modal
          title="Verification request"
          onClose={() => setSelected(null)}
          busy={mutation.isPending}
        >
          <div className="editor-form">
            <h3>{request.user.name || request.user.email}</h3>
            <p className="muted">
              {request.user.email} · {date(request.createdAt)}
            </p>
            <div className="request-reason">
              <span className="eyebrow">REASON FOR VERIFICATION</span>
              <p className="preserve-text">{request.reason}</p>
            </div>
            {safeUrl(request.idDocumentUrl) ? (
              <a
                className="button"
                href={safeUrl(request.idDocumentUrl)}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                <Icon name="external" size={16} />
                Open ID document
              </a>
            ) : (
              <p className="notice error">The document link is unavailable.</p>
            )}
            {request.status !== 'pending' ? (
              <div className="request-reason">
                <p className="muted">
                  {request.status === 'approved' ? 'Approved' : 'Rejected'}
                  {request.reviewedAt ? ` on ${date(request.reviewedAt)}` : ''}
                </p>
                {request.reviewNote && (
                  <p className="preserve-text">{request.reviewNote}</p>
                )}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (decision) mutation.mutate(decision)
                }}
              >
                <Feedback error={mutation.error} />
                <fieldset disabled={mutation.isPending}>
                  {!decision ? (
                    <div className="form-actions">
                      <button
                        type="button"
                        className="button danger"
                        onClick={() => setDecision('reject')}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="button primary"
                        disabled={!safeUrl(request.idDocumentUrl)}
                        onClick={() => setDecision('approve')}
                      >
                        Approve
                      </button>
                    </div>
                  ) : (
                    <div className="request-reason">
                      <p className="muted">
                        {decision === 'approve'
                          ? 'Approve this request and grant a verified badge?'
                          : 'Reject this request? The user can apply again.'}
                      </p>
                      {decision === 'reject' && (
                        <label>
                          Reason (optional)
                          <textarea
                            maxLength={500}
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </label>
                      )}
                      <div className="form-actions">
                        <button
                          type="button"
                          className="button"
                          onClick={() => setDecision(null)}
                        >
                          Back
                        </button>
                        <button
                          className={`button ${decision === 'approve' ? 'primary' : 'danger'}`}
                        >
                          {mutation.isPending
                            ? 'Saving…'
                            : decision === 'approve'
                              ? 'Confirm approval'
                              : 'Confirm rejection'}
                        </button>
                      </div>
                    </div>
                  )}
                </fieldset>
              </form>
            )}
          </div>
        </Modal>
      )}
    </main>
  )
}
