import { useEffect, useRef, type ReactNode } from 'react'
import { Navigate } from '@tanstack/react-router'
import { errorMessage, errorStatus } from '@/shared/lib/api-error'
import { Icon } from './Icon'
import type { PaginatedMeta } from '@/shared/types'

export function PageTitle({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading management-heading">
      <div>
        <span className="eyebrow">WORKSPACE</span>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
export function Feedback({
  error,
  success,
}: {
  error?: unknown
  success?: string
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {errorMessage(error)}
        </p>
      )}
      {success && (
        <p className="notice success" role="status">
          {success}
        </p>
      )}
    </>
  )
}
export function LoadingError({
  pending,
  error,
  retry,
}: {
  pending: boolean
  error: unknown
  retry: () => unknown
}) {
  if (errorStatus(error) === 403)
    return <Navigate to="/access-denied" replace />
  return (
    <>
      {pending && (
        <p className="panel state-panel" role="status">
          Loading…
        </p>
      )}
      {error && (
        <div className="panel state-panel">
          <Feedback error={error} />
          <button className="button" onClick={() => void retry()}>
            Try again
          </button>
        </div>
      )}
    </>
  )
}
export function Pagination({
  meta,
  onPage,
  fetching,
}: {
  meta: PaginatedMeta
  onPage: (page: number) => void
  fetching?: boolean
}) {
  return (
    <div className="pagination">
      <span>
        {meta.total.toLocaleString()} results · Page {meta.page} of{' '}
        {Math.max(1, meta.totalPages)}
      </span>
      <div>
        <button
          className="button"
          disabled={fetching || meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
        >
          Previous
        </button>
        <button
          className="button"
          disabled={fetching || meta.page >= meta.totalPages}
          onClick={() => onPage(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog
      className="modal"
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          disabled={busy}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function Status({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'success' : ''}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}
