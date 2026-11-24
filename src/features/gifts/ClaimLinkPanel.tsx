import { useState } from 'react'
import { date } from '@/shared/lib/display'
import type { ClaimLink } from './gifts.api'

/**
 * One-time view of a claim link: the backend only returns the raw link right
 * after it is issued, so staff must copy it or download the QR code now.
 */
export function ClaimLinkPanel({ claim, email, username }: { claim: ClaimLink; email: string; username?: string | null }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const qr = claim.qrCodeDataUrl.startsWith('data:image/png;base64,') ? claim.qrCodeDataUrl : null
  return (
    <div className="claim-link-panel">
      <p className="muted">
        {claim.emailStatus === 'sent' ? (
          <>Claim link emailed to <strong>{email}</strong>.</>
        ) : claim.emailStatus === 'failed' ? (
          <>The email to <strong>{email}</strong> was not sent. {claim.emailError}</>
        ) : (
          <>No email was sent. Share the QR code or link with <strong>{email}</strong>.</>
        )}{' '}
        It can be used once and expires {date(claim.expiresAt)}.
      </p>
      {qr && <div className="claim-qr">
        <img src={qr} alt="Claim link QR code" width={180} height={180} />
        <a
          className="button"
          href={qr}
          download={`abio-claim-${username || 'account'}.png`}
        >
          Download QR code
        </a>
      </div>}
      <label className="request-reason">
        Claim link
        <input
          className="invite-link-input"
          readOnly
          value={claim.claimUrl}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <p className="muted">
        Copy the link or download the QR code before closing. It is only shown once; you can issue a new one later, which stops this one working.
      </p>
      <p role="status" className="muted">
        {copied ? 'Link copied.' : copyError ? 'Clipboard unavailable. Select the link above and copy it manually.' : ''}
      </p>
      <button
        type="button"
        className="button primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(claim.claimUrl)
            setCopied(true)
            setCopyError(false)
          } catch {
            setCopyError(true)
          }
        }}
      >
        Copy claim link
      </button>
    </div>
  )
}
