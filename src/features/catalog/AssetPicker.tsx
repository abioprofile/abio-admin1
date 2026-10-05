import { isAxiosError } from 'axios'
import { useState } from 'react'
import { management } from '@/features/admin/api/management.api'
import { validateImage, isUploadedImage } from '@/shared/lib/image-upload'
import { errorMessage } from '@/shared/lib/api-error'

export function AssetPicker({ label, productId, gallery, values, onChange, onBusy, multiple = false }: {
  label: string; productId?: string; gallery: string[]; values: string[]
  onChange: (urls: string[]) => void; onBusy: (busy: boolean) => void; multiple?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <div className="full-width">
    <label>{label}
      <input type="file" accept="image/*" disabled={!productId || busy || (multiple && values.length >= 10)} onChange={async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file || !productId) return
        setError('')
        try {
          validateImage(file)
          setBusy(true); onBusy(true)
          const asset = await management.uploadProductAsset(productId, file)
          if (!isUploadedImage(asset.url)) throw new Error('The upload returned an invalid image URL. Please try again.')
          onChange(multiple ? [...new Set([...values, asset.url])] : [asset.url])
        } catch (error) { setError(isAxiosError(error) ? errorMessage(error) : error instanceof Error ? error.message : errorMessage(error)) }
        finally { setBusy(false); onBusy(false) }
      }} />
    </label>
    {!productId && <p>Create the product first to upload assets.</p>}
    {busy && <p role="status">Uploading {label.toLowerCase()}…</p>}
    {error && <p role="alert" className="notice error">{error}</p>}
    <label>Reuse gallery image for {label.toLowerCase()}
      <select value="" disabled={busy || (multiple && values.length >= 10)} onChange={event => {
        if (event.target.value) onChange(multiple ? [...new Set([...values, event.target.value])] : [event.target.value])
      }}>
        <option value="">Choose an uploaded gallery image</option>
        {gallery.filter(isUploadedImage).map((url,index) => <option key={url} value={url}>Gallery image {index + 1}</option>)}
      </select>
    </label>
    {values.map((url,index) => <div className="form-actions" key={`${url}-${index}`}>
      {isUploadedImage(url) ? <img src={url} alt={`${label} ${index + 1}`} width={64} height={64} style={{objectFit:'contain'}} /> : <span>Legacy image: remove and upload again.</span>}
      <button type="button" className="button" disabled={busy} onClick={() => onChange(values.filter((_,i) => i !== index))}>Remove {label.toLowerCase()} {index + 1}</button>
    </div>)}
    <small>Images up to 5MB{multiple ? '; up to 10 images' : ''}. Uploads are stored immediately; save to attach them.</small>
  </div>
}
