import { AssetPicker } from './AssetPicker'
import { errorStatus } from '@/shared/lib/api-error'
import { isUploadedImage, validateImage } from '@/shared/lib/image-upload'
import { safeUrl } from '@/shared/lib/display'
import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  management,
  type Product,
  type ProductInput,
  type Variant,
  type VariantInput,
} from '@/features/admin/api/management.api'
import {
  PageTitle,
  LoadingError,
  Feedback,
  Modal,
  Status,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { formatKobo } from '@/shared/lib/money'

function money(value: string) {
  const kobo = Math.round(Number(value) * 100)
  if (!Number.isFinite(kobo) || kobo < 0 || kobo > 2147483647)
    throw new Error('Enter a price between 0 and 21,474,836.47.')
  return kobo
}
export function ProductEditor({ id }: { id?: string }) {
  const query = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: ({ signal }) => management.product(id!, signal),
    enabled: Boolean(id),
  })
  return (
    <main className="dashboard">
      <Link className="back-link" to="/products">
        <Icon name="arrow" size={16} />
        All products
      </Link>
      {id && (
        <LoadingError
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
        />
      )}
      {(!id || query.data) && (
        <ProductForm key={id ?? 'new'} product={query.data} />
      )}
    </main>
  )
}
function ProductForm({ product }: { product?: Product }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const [success, setSuccess] = useState('')
  const [localError, setLocalError] = useState('')
  const [assetBusy, setAssetBusy] = useState(false)
  const [front, setFront] = useState(product?.metadata?.preview?.frontOverlayUrl ?? '')
  const [back, setBack] = useState(product?.metadata?.preview?.backOverlayUrl ?? '')
  const [gallery, setGallery] = useState<string[] | null>(null)
  const images = gallery ?? product?.imageUrls ?? []
  const upload = useMutation({
    mutationFn: (file: File) => management.uploadProductImage(product!.id, file),
    onSuccess: async (saved) => { setGallery(saved.imageUrls); await client.invalidateQueries({ queryKey: ['admin'] }) },
    onError: async (error) => {
      if (errorStatus(error) === 409) {
        setGallery(null)
        await client.invalidateQueries({ queryKey: ['admin', 'product', product?.id] })
      }
    },
  })
  const [variant, setVariant] = useState<Variant | 'new' | null>(null)
  const mutation = useMutation({
    mutationFn: (body: ProductInput) =>
      management.saveProduct(body, product?.id),
    onSuccess: async (saved) => {
      await client.invalidateQueries({ queryKey: ['admin'] })
      setSuccess('Product saved.')
      if (!product)
        await navigate({
          to: '/products/$id',
          params: { id: saved.id },
          replace: true,
        })
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess('')
    setLocalError('')
    const fields = new FormData(event.currentTarget)
    try {
      const name = String(fields.get('name')).trim()
      if (!name) throw new Error('Enter a product name.')
      if (images.some((url) => !isUploadedImage(url))) throw new Error('Remove legacy gallery images and upload replacements before saving.')
      if ([front, back].some(url => url && !isUploadedImage(url))) throw new Error('Upload overlay artwork before saving.')
      mutation.mutate({
        name,
        type: fields.get('type') as 'standard' | 'custom',
        basePriceKobo: money(String(fields.get('price'))),
        currency: product?.currency ?? 'NGN',
        description:
          String(fields.get('description')).trim() ||
          (product ? null : undefined),
        active: fields.get('active') === 'on',
        imageUrls: images,
        metadata: {
          ...product?.metadata,
          tagline: String(fields.get('tagline')).trim(),
          badge: String(fields.get('badge')).trim(),
          features: String(fields.get('features'))
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          preview: {
            ...product?.metadata?.preview,
            enabled: fields.get('previewEnabled') === 'on',
            defaultColor: String(fields.get('defaultColor')),
            frontOverlayUrl:
              front || undefined,
            backOverlayUrl:
              back || undefined,
          },
        },
        ...(fields.get('slug')
          ? { slug: String(fields.get('slug')).trim() }
          : {}),
      })
    } catch (error) {
      setLocalError((error as Error).message)
    }
  }
  return (
    <>
      <PageTitle
        title={product ? product.name : 'Add a product'}
        description={
          product
            ? 'Fine-tune the details, pricing, and available options.'
            : 'Start with the essentials. Add color variants after saving.'
        }
      />
      <Feedback error={mutation.error || upload.error} success={success} />
      {localError && (
        <p className="notice error" role="alert">
          {localError}
        </p>
      )}
      <form className="panel editor-form" onSubmit={submit}>
        <fieldset disabled={mutation.isPending || upload.isPending || assetBusy}>
          <div className="section-heading">
            <h2>Product details</h2>
            <p className="muted">What your customers will see.</p>
          </div>
          <div className="form-grid">
            <label>
              Product name
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={product?.name}
              />
            </label>
            <label>
              Product type
              <select name="type" defaultValue={product?.type ?? 'standard'}>
                <option value="standard">Standard</option>
                <option value="custom">Custom / personalized</option>
              </select>
            </label>
            <label>
              Base price ({product?.currency ?? 'NGN'})
              <input
                name="price"
                type="number"
                required
                min="0"
                max="21474836.47"
                step="0.01"
                defaultValue={
                  product ? (product.basePriceKobo / 100).toFixed(2) : ''
                }
              />
              <small>Enter the amount in Naira for NGN products.</small>
            </label>
            <label>
              Slug
              <input
                name="slug"
                maxLength={140}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={product?.slug}
                placeholder="Auto-generated if blank"
              />
              <small>Optional: lowercase words separated by hyphens.</small>
            </label>
            <label>
              Tagline
              <input
                name="tagline"
                maxLength={200}
                defaultValue={product?.metadata?.tagline ?? ''}
              />
            </label>
            <label>
              Product badge
              <input
                name="badge"
                maxLength={40}
                placeholder="Optional, e.g. Bestseller"
                defaultValue={product?.metadata?.badge ?? ''}
              />
            </label>
            <label className="full-width">
              Features
              <textarea
                name="features"
                rows={4}
                defaultValue={product?.metadata?.features?.join('\n') ?? ''}
              />
              <small>One feature per line; up to 12.</small>
            </label>
            <div className="full-width">
              <h3>Product gallery</h3>
              {!product ? <p>Create the product first, then upload its images.</p> : <label>Upload product image
                <input type="file" accept="image/*" disabled={upload.isPending || images.length >= 10} onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try { validateImage(file); setLocalError(''); upload.mutate(file) } catch (error) { setLocalError((error as Error).message) }
                  e.target.value = ''
                }} />
              </label>}
              {upload.isPending && <p role="status">Uploading image…</p>}
              <p className="muted">Up to 10 images, 5MB each. Uploads save immediately; save the product to apply removal or ordering.</p>
              {images.map((url, index) => <div key={`${url}-${index}`} className="form-actions">
                <img src={safeUrl(url)} alt={`Product image ${index + 1}`} width={64} height={64} style={{ objectFit: 'contain' }} />
                {!isUploadedImage(url) && <span>Legacy image: remove and upload again.</span>}
                <button type="button" className="button" disabled={index === 0} onClick={() => { const next = [...images]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setGallery(next) }}>Move earlier</button>
                <button type="button" className="button" onClick={() => setGallery(images.filter((_, i) => i !== index))}>Remove image {index + 1}</button>
              </div>)}
            </div>
            <label className="check-label">
              <input
                name="previewEnabled"
                type="checkbox"
                defaultChecked={product?.metadata?.preview?.enabled ?? false}
              />
              Enable dynamic card preview
            </label>
            <label>
              Default preview color
              <input
                type="color"
                name="defaultColor"
                defaultValue={
                  product?.metadata?.preview?.defaultColor ?? '#000000'
                }
              />
            </label>
            <AssetPicker label="Front overlay" productId={product?.id} gallery={images} values={front ? [front] : []} onChange={urls => setFront(urls[0] ?? '')} onBusy={setAssetBusy} />
            <AssetPicker label="Back overlay" productId={product?.id} gallery={images} values={back ? [back] : []} onChange={urls => setBack(urls[0] ?? '')} onBusy={setAssetBusy} />
            <p className="muted full-width">
              Use transparent artwork with no baked-in card background. The
              storefront applies the chosen color beneath it; uploaded gallery
              photos remain available.
            </p>
            <label className="full-width">
              Description
              <textarea
                name="description"
                rows={4}
                maxLength={2000}
                defaultValue={product?.description ?? ''}
              />
            </label>
          </div>
          <label className="check-label">
            <input
              name="active"
              type="checkbox"
              defaultChecked={product?.active ?? true}
            />
            Active — visible in the public catalog
          </label>
          <div className="form-actions">
            <button className="button primary">
              {mutation.isPending
                ? 'Saving…'
                : product
                  ? 'Save product'
                  : 'Create product'}
            </button>
          </div>
        </fieldset>
      </form>
      {product && (
        <section className="panel variant-panel">
          <div className="panel-heading">
            <div>
              <h2>Variants</h2>
              <p>Colors, stock, images, and optional price overrides.</p>
            </div>
            <button className="button" disabled={assetBusy || upload.isPending || mutation.isPending} onClick={() => setVariant('new')}>
              <Icon name="plus" size={16} />
              Add variant
            </button>
          </div>
          <div className="variant-list">
            {product.variants.map((item) => (
              <article key={item.id} className="variant-row">
                <div className="product-thumb">
                  {safeUrl(item.imageUrls[0]) ? (
                    <img src={safeUrl(item.imageUrls[0])} alt="" />
                  ) : (
                    <Icon name="products" />
                  )}
                </div>
                <div className="variant-info">
                  <strong>
                    <i
                      className="swatch"
                      style={{ background: item.colorHex ?? '#ddd' }}
                    />
                    {item.colorName}
                  </strong>
                  <p>
                    {item.stockQty} in stock ·{' '}
                    {item.priceKobo === null
                      ? 'Uses base price'
                      : product.currency === 'NGN'
                        ? formatKobo(item.priceKobo)
                        : `${product.currency} ${(item.priceKobo / 100).toFixed(2)}`}
                  </p>
                </div>
                <Status active={item.active} />
                <button
                  className="button"
                  disabled={assetBusy || upload.isPending || mutation.isPending}
                  aria-label={`Edit ${item.colorName}`}
                  onClick={() => setVariant(item)}
                >
                  <Icon name="edit" size={15} />
                  Edit
                </button>
              </article>
            ))}
          </div>
          {!product.variants.length && (
            <div className="empty-orders">
              <h3>Give your product some options.</h3>
              <p>Add a variant to set its color, stock, and images.</p>
            </div>
          )}
        </section>
      )}
      {product && variant && (
        <VariantForm
          product={product}
          variant={variant === 'new' ? undefined : variant}
          onBusy={setAssetBusy}
          onClose={() => setVariant(null)}
        />
      )}
    </>
  )
}
function VariantForm({
  product,
  variant,
  onClose,
  onBusy,
}: {
  product: Product
  variant?: Variant
  onClose: () => void
  onBusy: (busy: boolean) => void
}) {
  const [assetBusy, setAssetBusy] = useState(false)
  const [urls, setUrls] = useState(variant?.imageUrls ?? [])
  const client = useQueryClient()
  const [localError, setLocalError] = useState('')
  const mutation = useMutation({
    mutationFn: (body: VariantInput) =>
      management.saveVariant(product.id, body, variant?.id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin'] })
      onClose()
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError('')
    const fields = new FormData(event.currentTarget)
    try {
      if (urls.length > 10 || urls.some((url) => !isUploadedImage(url)))
        throw new Error(
          'Choose up to 10 images uploaded to this product.',
        )
      const name = String(fields.get('colorName')).trim()
      if (!name) throw new Error('Enter a color name.')
      mutation.mutate({
        colorName: name,
        colorHex: String(fields.get('colorHex')).trim() || null,
        stockQty: Number(fields.get('stock')),
        priceKobo:
          String(fields.get('price')).trim() === ''
            ? null
            : money(String(fields.get('price'))),
        imageUrls: urls,
        active: fields.get('active') === 'on',
      })
    } catch (error) {
      setLocalError((error as Error).message)
    }
  }
  return (
    <Modal
      title={variant ? `Edit ${variant.colorName}` : 'Add variant'}
      onClose={onClose}
      busy={mutation.isPending || assetBusy}
    >
      <form className="editor-form" onSubmit={submit}>
        <Feedback error={mutation.error} />
        {localError && (
          <p className="notice error" role="alert">
            {localError}
          </p>
        )}
        <fieldset disabled={mutation.isPending || assetBusy}>
          <div className="form-grid">
            <label>
              Color name
              <input
                name="colorName"
                required
                maxLength={80}
                defaultValue={variant?.colorName}
              />
            </label>
            <label>
              Color hex
              <input
                name="colorHex"
                pattern="#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?"
                placeholder="#222222"
                defaultValue={variant?.colorHex ?? ''}
              />
            </label>
            <label>
              Stock quantity
              <input
                name="stock"
                type="number"
                min="0"
                max="2147483647"
                step="1"
                required
                defaultValue={variant?.stockQty ?? 0}
              />
            </label>
            <label>
              Price override ({product.currency})
              <input
                name="price"
                type="number"
                min="0"
                max="21474836.47"
                step="0.01"
                placeholder="Use product base price"
                defaultValue={
                  variant?.priceKobo == null
                    ? ''
                    : (variant.priceKobo / 100).toFixed(2)
                }
              />
              <small>Leave blank to use the base price. Zero means free.</small>
            </label>
            <AssetPicker label="Variant images" productId={product.id} gallery={product.imageUrls} values={urls} onChange={setUrls} multiple onBusy={busy => { setAssetBusy(busy); onBusy(busy) }} />
          </div>
          <label className="check-label">
            <input
              name="active"
              type="checkbox"
              defaultChecked={variant?.active ?? true}
            />
            Active variant
          </label>
          <div className="form-actions">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary">
              {mutation.isPending ? 'Saving…' : 'Save variant'}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
