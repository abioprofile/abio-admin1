import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebounce } from '@/shared/hooks/useDebounce'
import {
  Feedback,
  LoadingError,
  Modal,
  PageTitle,
  Pagination,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { date } from '@/shared/lib/display'
import { queryKeys } from '@/shared/lib/query-keys'
import { ClaimLinkPanel } from './ClaimLinkPanel'
import { createGiftAccount, listGiftAccounts, type GiftStatus } from './gifts.api'

const USERNAME_PATTERN = '[a-zA-Z0-9_\\-]{3,30}'

export function GiftStatusBadge({ status }: { status: GiftStatus }) {
  return (
    <span className={`badge ${status === 'claimed' ? 'success' : 'pending'}`}>
      {status === 'claimed' ? 'Claimed' : 'Unclaimed'}
    </span>
  )
}

export function GiftAccountsPage() {
  const [filters, setFilters] = useState<{ page: number; status: '' | GiftStatus; q: string }>({
    page: 1,
    status: '',
    q: '',
  })
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim())
  if (q !== filters.q) setFilters({ ...filters, q, page: 1 })
  const [creating, setCreating] = useState(false)
  const query = useQuery({
    queryKey: queryKeys.giftAccounts(filters),
    queryFn: ({ signal }) =>
      listGiftAccounts({ ...filters, status: filters.status || undefined }, signal),
  })
  return (
    <main className="dashboard">
      <PageTitle
        title="Gift accounts"
        description="Create and build pages for people you're gifting a card to, then hand them over."
        action={
          <button className="button primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />
            Create gift account
          </button>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search gift accounts"
            placeholder="Search name, email or username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="filter-label">
          Status
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, page: 1, status: e.target.value as '' | GiftStatus })
            }
          >
            <option value="">All gift accounts</option>
            <option value="unclaimed">Unclaimed</option>
            <option value="claimed">Claimed</option>
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
      <LoadingError pending={query.isPending} error={query.error} retry={query.refetch} />
      {query.data && (
        <section className="panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Created by</th>
                  <th>Created</th>
                  <th>Link expires / Claimed</th>
                </tr>
              </thead>
              <tbody>
                {query.data.accounts.map((account) => (
                  <tr key={account.userId}>
                    <td>
                      <Link
                        className="row-link"
                        to="/gifts/$id"
                        params={{ id: account.userId }}
                      >
                        {account.name}
                      </Link>
                    </td>
                    <td>{account.username ? `@${account.username}` : 'Not set'}</td>
                    <td>{account.email}</td>
                    <td>
                      <GiftStatusBadge status={account.status} />
                    </td>
                    <td>{account.createdBy?.name || 'Not recorded'}</td>
                    <td>{date(account.createdAt)}</td>
                    <td>
                      {account.claimedAt
                        ? `Claimed ${date(account.claimedAt)}`
                        : account.claimLinkExpiresAt
                          ? `Expires ${date(account.claimLinkExpiresAt)}`
                          : 'No active link'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.accounts.length && (
            <div className="empty-orders">
              <Icon name="gift" size={30} />
              <h3>No gift accounts here yet.</h3>
              <p>Create one to start building a page for someone.</p>
            </div>
          )}
          <Pagination
            meta={query.data.pagination}
            fetching={query.isFetching}
            onPage={(page) => setFilters({ ...filters, page })}
          />
        </section>
      )}
      {creating && <CreateGiftAccount onClose={() => setCreating(false)} />}
    </main>
  )
}

function CreateGiftAccount({ onClose }: { onClose: () => void }) {
  const client = useQueryClient()
  const [form, setForm] = useState({ name: '', username: '', email: '', sendEmail: false })
  // The raw claim link is transient and must not stay in the mutation cache.
  const mutation = useMutation({
    mutationFn: createGiftAccount,
    gcTime: 0,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'gift-accounts'] })
    },
  })
  const created = mutation.data
  return (
    <Modal
      title={created ? 'Gift account created' : 'Create a gift account'}
      onClose={onClose}
      busy={mutation.isPending}
    >
      <div className="editor-form">
        {created ? (
          <>
            <ClaimLinkPanel
              claim={created.claim}
              email={created.account.email}
              username={created.account.username}
            />
            <div className="form-actions">
              <button className="button" onClick={onClose}>
                Done
              </button>
              <Link
                className="button primary"
                to="/gifts/$id"
                params={{ id: created.account.userId }}
              >
                Build the page
              </Link>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate({
                name: form.name.trim(),
                username: form.username.trim(),
                email: form.email.trim().toLowerCase(),
                sendEmail: form.sendEmail,
              })
            }}
          >
            <p className="muted">
              Nobody gets a password for this account, staff included. You can build the profile,
              links and theme until the recipient claims it with their link.
            </p>
            <Feedback error={mutation.error} />
            <fieldset disabled={mutation.isPending} className="form-grid">
              <label>
                Full name
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ada Lovelace"
                />
              </label>
              <label>
                Username
                <input
                  required
                  pattern={USERNAME_PATTERN}
                  title="3–30 letters, numbers, hyphens or underscores"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="ada"
                />
                <small>This is the page address printed on the card.</small>
              </label>
              <label className="full-width">
                Recipient email
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ada@example.com"
                />
                <small>Must not already have an Abio account.</small>
              </label>
              <label className="check-label full-width">
                <input
                  type="checkbox"
                  checked={form.sendEmail}
                  onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
                />
                Email the claim link now
              </label>
              <small className="full-width">
                Usually leave this off: build the page first, then send the link from the account page
                when it's ready. Once the recipient claims it, staff can no longer edit it.
              </small>
              <div className="form-actions full-width">
                <button className="button" type="button" onClick={onClose}>
                  Cancel
                </button>
                <button className="button primary">
                  {mutation.isPending ? 'Creating…' : 'Create gift account'}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </Modal>
  )
}
