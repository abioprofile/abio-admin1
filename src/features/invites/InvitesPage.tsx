import { useDebounce } from '@/shared/hooks/useDebounce'
import { useState } from 'react'
import { Navigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStaffProfile } from '@/features/auth/store/auth-store'
import { listInvites, createInvite } from './invites.api'
import {
  PageTitle,
  LoadingError,
  Feedback,
  Pagination,
  Modal,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { date } from '@/shared/lib/display'
export function InvitesPage() {
  const staff = useStaffProfile()
  const [filters, setFilters] = useState({ page: 1, status: '', q: '' })
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim())
  if (q !== filters.q) setFilters({ ...filters, q, page: 1 })
  const [creating, setCreating] = useState(false)
  const query = useQuery({
    queryKey: ['admin', 'invites', filters],
    queryFn: ({ signal }) =>
      listInvites({ ...filters, status: filters.status || undefined }, signal),
    enabled: Boolean(staff?.roles.includes('admin')),
  })
  if (!staff?.roles.includes('admin'))
    return <Navigate to="/access-denied" replace />
  return (
    <main className="dashboard">
      <PageTitle
        title="Invitations"
        description="Invite a moderator to help manage your workspace."
        action={
          <button className="button primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            Invite moderator
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search invitations"
            placeholder="Search invited email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="filter-label">
          Invitation status
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, page: 1, status: e.target.value })
            }
          >
            <option value="">All invitations</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
          </select>
        </label>
        <button
          className="button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
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
                  <th>Invited email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Invited by</th>
                  <th>Created</th>
                  <th>Expires / Accepted</th>
                </tr>
              </thead>
              <tbody>
                {query.data.invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="row-link">{invite.email}</td>
                    <td>Moderator</td>
                    <td>
                      <span
                        className={`badge ${invite.status === 'accepted' ? 'success' : invite.status === 'expired' ? 'failed' : 'pending'}`}
                      >
                        {invite.status}
                      </span>
                    </td>
                    <td>
                      {invite.invitedBy?.name ||
                        invite.invitedBy?.email ||
                        'Not recorded'}
                    </td>
                    <td>{date(invite.createdAt)}</td>
                    <td>
                      {invite.acceptedAt
                        ? `Accepted ${date(invite.acceptedAt)}`
                        : `Expires ${date(invite.expiresAt)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.invites.length && (
            <div className="empty-orders">
              <Icon name="invites" size={30} />
              <h3>No invitations here yet.</h3>
              <p>Create an invitation or try another status.</p>
            </div>
          )}
          <Pagination
            meta={query.data.pagination}
            fetching={query.isFetching}
            onPage={(page) => setFilters({ ...filters, page })}
          />
        </section>
      )}
      {creating && <CreateInvite onClose={() => setCreating(false)} />}
    </main>
  )
}
function CreateInvite({ onClose }: { onClose: () => void }) {
  const client = useQueryClient()
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  // The raw invitation token is transient and must not remain in the mutation cache.
  const mutation = useMutation({
    mutationFn: createInvite,
    gcTime: 0,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'invites'] })
    },
  })
  const created = mutation.data
  // Keep invitations on this admin origin, independent of the public app CLIENT_URL.
  const inviteUrl = created
    ? `${window.location.origin}/admin/accept-invite?token=${encodeURIComponent(created.token)}`
    : ''
  return (
    <Modal
      title={created ? 'Invitation ready' : 'Invite a moderator'}
      onClose={onClose}
      busy={mutation.isPending}
    >
      <div className="editor-form">
        {created ? (
          <>
            <p className="muted">
              {created.emailStatus === 'sent'
                ? 'Invitation email sent to '
                : 'The invitation was created, but the email was not sent. Share this link with '}
              <strong>{created.email}</strong>. {created.emailError} It expires{' '}
              {date(created.expiresAt)}.
            </p>
            <div className="request-reason">
              <label>
                Invitation link
                <input
                  className="invite-link-input"
                  readOnly
                  value={inviteUrl}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <p className="muted">
                Copy it before closing. The link is only shown once.
              </p>
            </div>
            <p role="status" className="muted">
              {copied
                ? 'Link copied.'
                : copyError
                  ? 'Clipboard unavailable. Select the link above and copy it manually.'
                  : ''}
            </p>
            <div className="form-actions">
              <button className="button" onClick={onClose}>
                Done
              </button>
              <button
                className="button primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteUrl)
                    setCopied(true)
                    setCopyError(false)
                  } catch {
                    setCopyError(true)
                  }
                }}
              >
                Copy invitation link
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate(email.trim().toLowerCase())
            }}
          >
            <p className="muted">
              Moderators can manage products, orders, users, themes, and
              verification. Only admins can invite staff.
            </p>
            <Feedback error={mutation.error} />
            <fieldset disabled={mutation.isPending}>
              <label className="invite-email">
                Email address
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@example.com"
                />
              </label>
              <p className="muted">
                Creating a new invitation replaces any unused invitation for
                this email. The recipient must sign in with a verified account
                using this address.
              </p>
              <div className="form-actions">
                <button className="button" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button className="button primary">
                  {mutation.isPending ? 'Creating…' : 'Create invitation'}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </Modal>
  )
}
