import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Feedback, LoadingError, Modal, PageTitle } from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { date, safeUrl } from '@/shared/lib/display'
import { validateImage } from '@/shared/lib/image-upload'
import { queryKeys } from '@/shared/lib/query-keys'
import { listThemes } from '@/features/themes/themes.api'
import { ThemePreview } from '@/features/themes/ThemePreview'
import { ClaimLinkPanel } from './ClaimLinkPanel'
import { GiftStatusBadge } from './GiftAccountsPage'
import {
  createGiftLink,
  deleteGiftAccount,
  deleteGiftAvatar,
  deleteGiftLink,
  getGiftAccount,
  issueClaimLink,
  reorderGiftLinks,
  setGiftTheme,
  updateGiftLink,
  updateGiftProfile,
  uploadGiftAvatar,
  type GiftAccountDetail,
  type GiftLink,
  type LinkInput,
} from './gifts.api'

const USERNAME_PATTERN = '[a-zA-Z0-9_\\-]{3,30}'

/** Refresh this account everywhere after any staff edit. */
function useInvalidateGift(id: string) {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.giftAccount(id) }),
      client.invalidateQueries({ queryKey: ['admin', 'gift-accounts'] }),
    ])
}

export function GiftAccountDetailPage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: queryKeys.giftAccount(id),
    queryFn: ({ signal }) => getGiftAccount(id, signal),
  })
  const account = query.data
  return (
    <main className="dashboard">
      <Link className="back-link" to="/gifts">
        <Icon name="arrow" size={16} />
        All gift accounts
      </Link>
      <LoadingError pending={query.isPending} error={query.error} retry={query.refetch} />
      {account && (
        <>
          <PageTitle
            title={account.name}
            description={`${account.username ? `@${account.username} · ` : ''}${account.email}`}
            action={<GiftStatusBadge status={account.status} />}
          />
          {account.status === 'claimed' ? (
            <section className="panel detail-panel">
              <h2>Claimed</h2>
              <p className="muted">
                {account.name} claimed this account on {date(account.claimedAt!)}. It belongs to them
                now, so staff can no longer edit it.{' '}
                {account.isEmailVerified
                  ? 'Their email is verified.'
                  : 'They still need to verify their email before signing in.'}
              </p>
            </section>
          ) : (
            <>
              <HandoverPanel account={account} />
              <div className="detail-grid">
                <ProfilePanel account={account} />
                <ThemePanel account={account} />
              </div>
              <LinksPanel account={account} />
              <DeletePanel account={account} />
            </>
          )}
        </>
      )}
    </main>
  )
}

function HandoverPanel({ account }: { account: GiftAccountDetail }) {
  const invalidate = useInvalidateGift(account.userId)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(account.email)
  const [sendEmail, setSendEmail] = useState(true)
  // The raw claim link is transient and must not stay in the mutation cache.
  const mutation = useMutation({
    mutationFn: () =>
      issueClaimLink(account.userId, {
        email: email.trim().toLowerCase() !== account.email ? email.trim().toLowerCase() : undefined,
        sendEmail,
      }),
    gcTime: 0,
    onSuccess: () => invalidate(),
  })
  const close = () => {
    mutation.reset()
    setOpen(false)
  }
  return (
    <section className="panel detail-panel">
      <h2>Hand over</h2>
      <p className="muted">
        When the page is ready, send the claim link and print its QR code on the card. The recipient
        sets their own password, verifies their email, and from then on only they can edit the page.
        {account.claimLinkExpiresAt
          ? ` The current link expires ${date(account.claimLinkExpiresAt)}.`
          : ''}
      </p>
      <button className="button primary" onClick={() => setOpen(true)}>
        Send claim link
      </button>
      {open && (
        <Modal
          title={mutation.data ? 'Claim link ready' : 'Send claim link'}
          onClose={close}
          busy={mutation.isPending}
        >
          <div className="editor-form">
            {mutation.data ? (
              <>
                <ClaimLinkPanel
                  claim={mutation.data}
                  email={email.trim().toLowerCase()}
                  username={account.username}
                />
                <div className="form-actions">
                  <button className="button" onClick={close}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  mutation.mutate()
                }}
              >
                <p className="muted">
                  This creates a new link valid for 30 days. Any earlier link for this account stops
                  working.
                </p>
                <Feedback error={mutation.error} />
                <fieldset disabled={mutation.isPending}>
                  <label>
                    Recipient email
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                    Email the link to this address
                  </label>
                  <div className="form-actions">
                    <button className="button" type="button" onClick={close}>
                      Cancel
                    </button>
                    <button className="button primary">
                      {mutation.isPending ? 'Creating…' : 'Create claim link'}
                    </button>
                  </div>
                </fieldset>
              </form>
            )}
          </div>
        </Modal>
      )}
    </section>
  )
}

function ProfilePanel({ account }: { account: GiftAccountDetail }) {
  const invalidate = useInvalidateGift(account.userId)
  const profile = account.profile
  const [form, setForm] = useState({
    displayName: account.name,
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    isPublic: profile?.isPublic ?? true,
  })
  const [success, setSuccess] = useState('')
  const [fileError, setFileError] = useState('')
  const [confirmUsername, setConfirmUsername] = useState(false)
  const savedUsername = profile?.username ?? ''
  const save = useMutation({
    mutationFn: () =>
      updateGiftProfile(account.userId, {
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        bio: form.bio,
        location: form.location,
        isPublic: form.isPublic,
      }),
    onSuccess: async () => {
      await invalidate()
      setConfirmUsername(false)
      setSuccess('Profile saved.')
    },
  })
  const avatar = useMutation({
    mutationFn: (file: File | null) =>
      file ? uploadGiftAvatar(account.userId, file) : deleteGiftAvatar(account.userId),
    onSuccess: async (_, file) => {
      await invalidate()
      setSuccess(file ? 'Photo updated.' : 'Photo removed.')
    },
  })
  const avatarUrl = safeUrl(profile?.avatarUrl)
  return (
    <section className="panel detail-panel">
      <h2>Profile</h2>
      <Feedback error={save.error || avatar.error} success={success} />
      {fileError && (
        <p className="notice error" role="alert">
          {fileError}
        </p>
      )}
      <div className="gift-avatar-row">
        {avatarUrl ? (
          <img className="gift-avatar" src={avatarUrl} alt="" />
        ) : (
          <span className="gift-avatar placeholder">{account.name.slice(0, 1).toUpperCase()}</span>
        )}
        <label className="button">
          {avatar.isPending ? 'Uploading…' : 'Upload photo'}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={avatar.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                validateImage(file)
                setFileError('')
                setSuccess('')
                avatar.mutate(file)
              } catch (error) {
                setFileError((error as Error).message)
              }
            }}
          />
        </label>
        {avatarUrl && (
          <button
            className="button"
            disabled={avatar.isPending}
            onClick={() => {
              setSuccess('')
              avatar.mutate(null)
            }}
          >
            Remove
          </button>
        )}
      </div>
      <form
        className="editor-form gift-form"
        onSubmit={(e) => {
          e.preventDefault()
          setSuccess('')
          // Changing the page address breaks any card already printed with it.
          if (savedUsername && form.username.trim() !== savedUsername) setConfirmUsername(true)
          else save.mutate()
        }}
      >
        <fieldset disabled={save.isPending} className="form-grid">
          <label>
            Display name
            <input
              required
              maxLength={100}
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
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
            />
          </label>
          <label className="full-width">
            Bio
            <textarea
              rows={3}
              maxLength={500}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              maxLength={100}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
            />
            Public page
          </label>
          <div className="form-actions full-width">
            <button className="button primary">{save.isPending ? 'Saving…' : 'Save profile'}</button>
          </div>
        </fieldset>
      </form>
      {confirmUsername && (
        <Modal title="Change the page address?" onClose={() => setConfirmUsername(false)} busy={save.isPending}>
          <div className="editor-form">
            <Feedback error={save.error} />
            <p className="muted">
              The page moves from <strong>@{savedUsername}</strong> to{' '}
              <strong>@{form.username.trim()}</strong>. Any card already printed with @{savedUsername}{' '}
              will stop opening this page, and that name becomes free for anyone to take.
            </p>
            <div className="form-actions">
              <button className="button" onClick={() => setConfirmUsername(false)} disabled={save.isPending}>
                Keep @{savedUsername}
              </button>
              <button className="button danger" disabled={save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? 'Saving…' : 'Change address'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

function ThemePanel({ account }: { account: GiftAccountDetail }) {
  const invalidate = useInvalidateGift(account.userId)
  const themes = useQuery({ queryKey: ['themes'], queryFn: ({ signal }) => listThemes(signal) })
  const selected = account.profile?.display?.selected_theme ?? null
  const mutation = useMutation({
    mutationFn: (themeId: string | null) => setGiftTheme(account.userId, themeId),
    onSuccess: () => invalidate(),
  })
  const available = themes.data?.filter((theme) => theme.active || theme.id === selected) ?? []
  return (
    <section className="panel detail-panel">
      <h2>Theme</h2>
      <Feedback error={mutation.error} />
      <LoadingError pending={themes.isPending} error={themes.error} retry={themes.refetch} />
      {themes.data && (
        <>
          <div className="gift-theme-grid">
            {available.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`gift-theme-option ${theme.id === selected ? 'selected' : ''}`}
                aria-pressed={theme.id === selected}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(theme.id)}
              >
                <ThemePreview theme={theme} compact />
                <span>{theme.name}</span>
              </button>
            ))}
          </div>
          {!available.length && <p className="muted">No themes yet. Create one under Themes.</p>}
          {selected && (
            <button
              className="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(null)}
            >
              Use default look
            </button>
          )}
        </>
      )}
    </section>
  )
}

const emptyLink: LinkInput = { title: '', url: '', platform: '' }

function cleanLink(input: LinkInput): LinkInput {
  return {
    title: input.title.trim(),
    url: input.url.trim(),
    ...(input.platform?.trim() ? { platform: input.platform.trim() } : {}),
  }
}

function LinksPanel({ account }: { account: GiftAccountDetail }) {
  const invalidate = useInvalidateGift(account.userId)
  const links = account.profile?.links ?? []
  const [draft, setDraft] = useState<LinkInput>(emptyLink)
  const [editing, setEditing] = useState<GiftLink | null>(null)
  const [deleting, setDeleting] = useState<GiftLink | null>(null)
  const add = useMutation({
    mutationFn: () => createGiftLink(account.userId, cleanLink(draft)),
    onSuccess: async () => {
      await invalidate()
      setDraft(emptyLink)
    },
  })
  const change = useMutation({
    mutationFn: ({ link, body }: { link: GiftLink; body: Partial<LinkInput> }) =>
      updateGiftLink(account.userId, link.id, body),
    onSuccess: async () => {
      await invalidate()
      setEditing(null)
    },
  })
  const remove = useMutation({
    mutationFn: (link: GiftLink) => deleteGiftLink(account.userId, link.id),
    onSuccess: async () => {
      await invalidate()
      setDeleting(null)
    },
  })
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderGiftLinks(account.userId, ids),
    onSuccess: () => invalidate(),
  })
  const move = (index: number, by: -1 | 1) => {
    const ids = links.map((link) => link.id)
    const [item] = ids.splice(index, 1)
    ids.splice(index + by, 0, item)
    reorder.mutate(ids)
  }
  return (
    <section className="panel detail-panel">
      <h2>Links</h2>
      <Feedback error={add.error || reorder.error || (!editing && change.error) || (!deleting && remove.error)} />
      {links.length ? (
        <ol className="gift-link-list">
          {links.map((link, index) => (
            <li key={link.id}>
              <div>
                <strong>{link.title}</strong>
                <span className="muted">{link.url}</span>
              </div>
              <span className={`badge ${link.isVisible ? 'success' : ''}`}>
                {link.isVisible ? 'Visible' : 'Hidden'}
              </span>
              <div className="gift-link-actions">
                <button
                  className="button"
                  aria-label={`Move ${link.title} up`}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  className="button"
                  aria-label={`Move ${link.title} down`}
                  disabled={index === links.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  className="button"
                  disabled={change.isPending}
                  onClick={() => change.mutate({ link, body: { isVisible: !link.isVisible } })}
                >
                  {link.isVisible ? 'Hide' : 'Show'}
                </button>
                <button className="button" onClick={() => { change.reset(); setEditing(link) }}>
                  <Icon name="edit" size={15} />
                  Edit
                </button>
                <button className="button danger" onClick={() => { remove.reset(); setDeleting(link) }}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">No links yet. Add the first one below.</p>
      )}
      <form
        className="editor-form gift-form"
        onSubmit={(e) => {
          e.preventDefault()
          add.mutate()
        }}
      >
        <h3>Add a link</h3>
        <LinkFields value={draft} onChange={setDraft} disabled={add.isPending} />
        <div className="form-actions">
          <button className="button primary" disabled={add.isPending}>
            <Icon name="plus" size={16} />
            {add.isPending ? 'Adding…' : 'Add link'}
          </button>
        </div>
      </form>
      {editing && (
        <EditLink
          link={editing}
          busy={change.isPending}
          error={change.error}
          onClose={() => setEditing(null)}
          onSave={(body) => change.mutate({ link: editing, body })}
        />
      )}
      {deleting && (
        <Modal title="Delete link" onClose={() => setDeleting(null)} busy={remove.isPending}>
          <div className="editor-form">
            <Feedback error={remove.error} />
            <p className="muted">
              Delete <strong>{deleting.title}</strong>? This can't be undone.
            </p>
            <div className="form-actions">
              <button className="button" onClick={() => setDeleting(null)} disabled={remove.isPending}>
                Cancel
              </button>
              <button
                className="button danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleting)}
              >
                {remove.isPending ? 'Deleting…' : 'Delete link'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

function LinkFields({
  value,
  onChange,
  disabled,
}: {
  value: LinkInput
  onChange: (value: LinkInput) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="form-grid">
      <label>
        Title
        <input
          required
          maxLength={100}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="My website"
        />
      </label>
      <label>
        URL
        <input
          type="url"
          required
          pattern="https?://.+"
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://example.com"
        />
      </label>
      <label className="full-width">
        Platform name
        <input
          maxLength={50}
          value={value.platform ?? ''}
          onChange={(e) => onChange({ ...value, platform: e.target.value })}
          placeholder="Website"
        />
        <small>Needed when the URL isn't a known social platform (Instagram, X, TikTok…).</small>
      </label>
    </fieldset>
  )
}

function EditLink({
  link,
  busy,
  error,
  onClose,
  onSave,
}: {
  link: GiftLink
  busy: boolean
  error: unknown
  onClose: () => void
  onSave: (body: LinkInput) => void
}) {
  const [value, setValue] = useState<LinkInput>({
    title: link.title,
    url: link.url,
    platform: link.platform ?? '',
  })
  return (
    <Modal title="Edit link" onClose={onClose} busy={busy}>
      <form
        className="editor-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(cleanLink(value))
        }}
      >
        <Feedback error={error} />
        <LinkFields value={value} onChange={setValue} disabled={busy} />
        <div className="form-actions">
          <button className="button" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save link'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function DeletePanel({ account }: { account: GiftAccountDetail }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const confirmWord = account.username ?? account.email
  const mutation = useMutation({
    mutationFn: () => deleteGiftAccount(account.userId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: queryKeys.giftAccount(account.userId) })
      await client.invalidateQueries({ queryKey: ['admin'] })
      await navigate({ to: '/gifts' })
    },
  })
  return (
    <section className="panel detail-panel">
      <h2>Delete gift account</h2>
      <p className="muted">
        Removes this account with its profile, links and theme. Use this if the card won't be given
        out. Claimed accounts can't be deleted by staff.
      </p>
      <button className="button danger" onClick={() => { mutation.reset(); setTyped(''); setOpen(true) }}>
        Delete gift account
      </button>
      {open && (
        <Modal title="Delete gift account" onClose={() => setOpen(false)} busy={mutation.isPending}>
          <form
            className="editor-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim() === confirmWord) mutation.mutate()
            }}
          >
            <Feedback error={mutation.error} />
            <p className="muted">
              This can't be undone. Any claim link already sent will stop working. Type{' '}
              <strong>{confirmWord}</strong> to confirm.
            </p>
            <fieldset disabled={mutation.isPending}>
              <label>
                Confirm
                <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
              </label>
              <div className="form-actions">
                <button className="button" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button className="button danger" disabled={typed.trim() !== confirmWord}>
                  {mutation.isPending ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </section>
  )
}
