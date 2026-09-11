import { date } from '@/shared/lib/display'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { management } from '@/features/admin/api/management.api'
import { useStaffProfile } from '@/features/auth/store/auth-store'
import {
  PageTitle,
  LoadingError,
  Feedback,
  Modal,
  Status,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
type Action = 'deactivate' | 'reactivate' | 'grant' | 'revoke' | 'revoke-moderator'
const actionLabels: Record<Action, string> = {
  deactivate: 'Deactivate account',
  reactivate: 'Reactivate account',
  grant: 'Grant verified badge',
  revoke: 'Revoke verified badge',
  'revoke-moderator': 'Revoke moderator',
}
export function UserDetailPage({ id }: { id: string }) {
  const client = useQueryClient()
  const staff = useStaffProfile()
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [success, setSuccess] = useState('')
  const query = useQuery({
    queryKey: ['admin', 'user-detail', id],
    queryFn: ({ signal }) => management.user(id, signal),
  })
  const mutation = useMutation({
    mutationFn: (selected: Action) =>
      selected === 'grant'
        ? management.grant(id)
        : selected === 'revoke'
          ? management.revoke(id, reason.trim())
          : selected === 'revoke-moderator'
            ? management.revokeModerator(id, reason)
            : management.setActive(id, selected === 'reactivate'),
    onSuccess: async (_, selected) => {
      await client.invalidateQueries({ queryKey: ['admin'] })
      setAction(null)
      setSuccess(selected === 'revoke-moderator' ? 'Moderator role revoked successfully.' : 'User updated successfully.')
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'user-detail', id] })
    },
  })
  const user = query.data
  const canRevokeModerator = Boolean(staff?.roles.includes('admin') && user?.roles.includes('moderator'))
  function choose(selected: Action) {
    mutation.reset()
    setReason('')
    setSuccess('')
    setAction(selected)
  }
  return (
    <main className="dashboard">
      <Link className="back-link" to="/users">
        <Icon name="arrow" size={16} />
        All users
      </Link>
      <LoadingError
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {user && (
        <>
          <PageTitle
            title={user.name || 'User details'}
            description={user.email}
          />
          <Feedback success={success} />
          <div className="detail-grid">
            <section className="panel detail-panel">
              <h2>Profile</h2>
              <dl className="detail-list">
                <div>
                  <dt>Username</dt>
                  <dd>
                    {user.profile?.username
                      ? `@${user.profile.username}`
                      : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt>Account</dt>
                  <dd>
                    <Status active={user.active} />
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    {user.isEmailVerified ? 'Confirmed' : 'Not confirmed'}
                  </dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{user.roles.join(', ') || 'User'}</dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>{date(user.createdAt)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{user.profile?.location || 'Not set'}</dd>
                </div>
                <div>
                  <dt>Bio</dt>
                  <dd>{user.profile?.bio || 'Not set'}</dd>
                </div>
              </dl>
            </section>
            <div className="stack">
              {canRevokeModerator && (
                <section className="panel detail-panel">
                  <h2>Moderator access</h2>
                  <p className="muted">Remove this user's moderator role. Their account status and any admin role are preserved.</p>
                  <button className="button danger" onClick={() => choose('revoke-moderator')}>
                    <Icon name="users" size={17} />
                    Revoke moderator
                  </button>
                </section>
              )}
              <section className="panel detail-panel">
                <h2>Account access</h2>
                <p className="muted">
                  {user.active
                    ? 'Deactivating this account prevents the user from signing in or using existing sessions.'
                    : 'Reactivate this account to restore access.'}
                </p>
                <button
                  className={`button ${user.active ? 'danger' : 'primary'}`}
                  disabled={staff?.id === user.id}
                  onClick={() =>
                    choose(user.active ? 'deactivate' : 'reactivate')
                  }
                >
                  {user.active ? 'Deactivate account' : 'Reactivate account'}
                </button>
                {staff?.id === user.id && (
                  <p className="muted">
                    You cannot change your own account status.
                  </p>
                )}
              </section>
              <section className="panel detail-panel">
                <h2>Verification badge</h2>
                <p className="muted">
                  {user.hasBadge
                    ? 'This user has an active verified badge.'
                    : 'This user does not have an active verified badge. A direct grant also closes any pending verification request.'}
                </p>
                <button
                  className="button"
                  onClick={() => choose(user.hasBadge ? 'revoke' : 'grant')}
                >
                  <Icon name="verification" size={17} />
                  {user.hasBadge
                    ? 'Revoke verified badge'
                    : 'Grant verified badge'}
                </button>
              </section>
            </div>
          </div>
          <section className="panel detail-panel history-panel">
            <h2>Badge records</h2>
            {user.badges.length ? (
              <div className="record-list">
                {user.badges.map((badge) => (
                  <article key={badge.id}>
                    <div>
                      <strong className="capitalize">{badge.badgeType}</strong>
                      <span
                        className={`badge ${badge.revokedAt ? '' : 'success'}`}
                      >
                        {badge.revokedAt ? 'Revoked' : 'Active'}
                      </span>
                    </div>
                    <p className="muted">
                      Granted {date(badge.assignedAt)}
                      {badge.revokedAt
                        ? ` · Revoked ${date(badge.revokedAt)}`
                        : ''}
                    </p>
                    {badge.revokeReason && (
                      <p className="preserve-text">{badge.revokeReason}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No badges have been assigned.</p>
            )}
          </section>
        </>
      )}
      {action && (
        <Modal
          title={actionLabels[action]}
          onClose={() => setAction(null)}
          busy={mutation.isPending}
        >
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (action === 'revoke-moderator' && !canRevokeModerator) return
              mutation.mutate(action)
            }}
          >
            <p className="muted">
              {action === 'revoke-moderator'
                ? `Remove the moderator role from ${user?.name || user?.email}? Any admin role they hold will remain.`
                : action === 'deactivate'
                ? `Deactivate ${user?.name || user?.email}? Their existing sessions will stop working.`
                : action === 'reactivate'
                  ? `Restore account access for ${user?.name || user?.email}?`
                  : action === 'grant'
                    ? `Grant a verified badge to ${user?.name || user?.email}? Any pending request will be approved.`
                    : `Remove the verified badge from ${user?.name || user?.email}? They can request verification again.`}
            </p>
            <Feedback error={mutation.error} />
            <fieldset disabled={mutation.isPending}>
              {(action === 'revoke' || action === 'revoke-moderator') && (
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
                  className="button"
                  type="button"
                  onClick={() => setAction(null)}
                >
                  Cancel
                </button>
                <button
                  disabled={action === 'revoke-moderator' && !canRevokeModerator}
                  className={`button ${action === 'deactivate' || action === 'revoke' || action === 'revoke-moderator' ? 'danger' : 'primary'}`}
                >
                  {mutation.isPending ? 'Saving…' : actionLabels[action]}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </main>
  )
}
