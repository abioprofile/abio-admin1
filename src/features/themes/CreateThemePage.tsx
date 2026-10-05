import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  createTheme,
  getTheme,
  updateTheme,
  type Theme,
  type ThemeInput,
} from './themes.api'
import { ThemePreview } from './ThemePreview'
import {
  PageTitle,
  Feedback,
  LoadingError,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { isUploadedImage, validateImage } from '@/shared/lib/image-upload'
const initial: ThemeInput = {
  name: '',
  font_config: {
    name: 'Arial',
    fillColor: '#25301e',
    weight: 'regular',
    italic: false,
    underline: false,
  },
  corner_config: {
    type: 'curved',
    fillColor: '#ffffff',
    strokeColor: null,
    opacity: 1,
    shadow: 'none',
  },
  wallpaper_config: { type: 'fill', backgroundColor: '#e5edda' },
}
export function EditThemePage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['admin', 'theme', id],
    queryFn: ({ signal }) => getTheme(id, signal),
  })
  if (!query.data)
    return (
      <main className="dashboard">
        <LoadingError
          pending={query.isPending}
          error={query.error}
          retry={query.refetch}
        />
      </main>
    )
  return <CreateThemePage key={id} existing={query.data} />
}
export function CreateThemePage({ existing }: { existing?: Theme }) {
  const [draft, setDraft] = useState<ThemeInput>(() =>
    existing
      ? {
          name: existing.name,
          font_config: { ...initial.font_config, ...existing.font_config },
          corner_config: {
            ...initial.corner_config,
            ...existing.corner_config,
          },
          wallpaper_config: {
            ...initial.wallpaper_config,
            ...existing.wallpaper_config,
            type:
              existing.wallpaper_config?.type === 'solid'
                ? 'fill'
                : (existing.wallpaper_config?.type ?? 'fill'),
          },
        }
      : initial,
  )
  const [error, setError] = useState('')
  const client = useQueryClient()
  const navigate = useNavigate()
  const [fill, setFill] = useState(
    typeof draft.wallpaper_config.backgroundColor === 'string'
      ? draft.wallpaper_config.backgroundColor
      : Array.isArray(draft.wallpaper_config.backgroundColor)
        ? (draft.wallpaper_config.backgroundColor[0]?.color ?? '#e5edda')
        : '#e5edda',
  )
  const [end, setEnd] = useState(
    Array.isArray(draft.wallpaper_config.backgroundColor)
      ? (draft.wallpaper_config.backgroundColor[1]?.color ?? '#b8cf9b')
      : '#b8cf9b',
  )
  const [imageFile, setImageFile] = useState<File>()
  const [image, setImage] = useState(draft.wallpaper_config.image ?? '')
  const mutation = useMutation({
    mutationFn: (body: ThemeInput) =>
      existing ? updateTheme(existing.id, body, body.wallpaper_config.type === 'image' ? imageFile : undefined) : createTheme(body, body.wallpaper_config.type === 'image' ? imageFile : undefined),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin'] })
      await navigate({ to: '/themes' })
    },
  })
  const font = (value: Partial<ThemeInput['font_config']>) =>
    setDraft({ ...draft, font_config: { ...draft.font_config, ...value } })
  const corners = (value: Partial<ThemeInput['corner_config']>) =>
    setDraft({ ...draft, corner_config: { ...draft.corner_config, ...value } })
  function wallpaper(
    type: ThemeInput['wallpaper_config']['type'],
    start = fill,
    stop = end,
    url = image,
  ) {
    setDraft({
      ...draft,
      wallpaper_config:
        type === 'image'
          ? { type, image: url }
          : type === 'gradient'
            ? {
                type,
                backgroundColor: [
                  { color: start, amount: 0 },
                  { color: stop, amount: 1 },
                ],
              }
            : { type: 'fill', backgroundColor: start },
    })
  }
  return (
    <main className="dashboard">
      <Link className="back-link" to="/themes">
        <Icon name="arrow" size={16} />
        All themes
      </Link>
      <PageTitle
        title={existing ? `Edit ${existing.name}` : 'Create a theme'}
        description="Style the details and see your new look come together."
      />
      <div className="theme-builder">
        <form
          className="panel editor-form"
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            if (!draft.name.trim()) {
              setError('Enter a theme name.')
              return
            }
            if (
              draft.wallpaper_config.type === 'image' &&
              !imageFile && !isUploadedImage(image)
            ) {
              setError('Upload a wallpaper image before saving.')
              return
            }
            mutation.mutate({
              ...draft,
              name: draft.name.trim(),
              wallpaper_config:
                draft.wallpaper_config.type === 'image'
                  ? { type: 'image', image: image.trim() }
                  : draft.wallpaper_config,
            })
          }}
        >
          <Feedback error={mutation.error} />
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <fieldset disabled={mutation.isPending}>
            <label>
              Theme name
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Sunday morning"
              />
            </label>
            <section className="theme-form-section">
              <h2>Typography</h2>
              <div className="form-grid">
                <label>
                  Font
                  <select
                    value={draft.font_config.name}
                    onChange={(e) => font({ name: e.target.value })}
                  >
                    {[
                      'Arial',
                      'Georgia',
                      'Verdana',
                      'Tahoma',
                      'Trebuchet MS',
                      'Times New Roman',
                      'Courier New',
                    ].map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Weight
                  <select
                    value={draft.font_config.weight}
                    onChange={(e) =>
                      font({
                        weight: e.target
                          .value as ThemeInput['font_config']['weight'],
                      })
                    }
                  >
                    {['regular', 'medium', 'semibold', 'bold'].map((weight) => (
                      <option key={weight}>{weight}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Text color
                  <input
                    type="color"
                    value={draft.font_config.fillColor}
                    onChange={(e) => font({ fillColor: e.target.value })}
                  />
                </label>
                <div className="theme-toggles">
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={draft.font_config.italic}
                      onChange={(e) => font({ italic: e.target.checked })}
                    />
                    Italic
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={draft.font_config.underline}
                      onChange={(e) => font({ underline: e.target.checked })}
                    />
                    Underline
                  </label>
                </div>
              </div>
            </section>
            <section className="theme-form-section">
              <h2>Link buttons</h2>
              <div className="form-grid">
                <label>
                  Shape
                  <select
                    value={draft.corner_config.type}
                    onChange={(e) =>
                      corners({
                        type: e.target
                          .value as ThemeInput['corner_config']['type'],
                      })
                    }
                  >
                    <option value="sharp">Sharp</option>
                    <option value="curved">Curved</option>
                    <option value="round">Round</option>
                  </select>
                </label>
                <label>
                  Button fill
                  <input
                    type="color"
                    value={draft.corner_config.fillColor}
                    onChange={(e) => corners({ fillColor: e.target.value })}
                  />
                </label>
                <label>
                  Shadow
                  <select
                    value={draft.corner_config.shadow}
                    onChange={(e) =>
                      corners({
                        shadow: e.target
                          .value as ThemeInput['corner_config']['shadow'],
                      })
                    }
                  >
                    <option value="none">None</option>
                    <option value="soft">Soft</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
                <label>
                  Opacity (
                  {Math.round((draft.corner_config.opacity ?? 1) * 100)}%)
                  <input
                    aria-label="Button opacity"
                    type="range"
                    min="0"
                    max="100"
                    value={(draft.corner_config.opacity ?? 1) * 100}
                    onChange={(e) =>
                      corners({ opacity: Number(e.target.value) / 100 })
                    }
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.corner_config.strokeColor)}
                    onChange={(e) =>
                      corners({
                        strokeColor: e.target.checked ? '#25301e' : null,
                      })
                    }
                  />
                  Button border
                </label>
                {draft.corner_config.strokeColor && (
                  <label>
                    Border color
                    <input
                      type="color"
                      value={draft.corner_config.strokeColor}
                      onChange={(e) => corners({ strokeColor: e.target.value })}
                    />
                  </label>
                )}
              </div>
            </section>
            <section className="theme-form-section">
              <h2>Wallpaper</h2>
              <label>
                Background type
                <select
                  value={draft.wallpaper_config.type}
                  onChange={(e) =>
                    wallpaper(
                      e.target.value as ThemeInput['wallpaper_config']['type'],
                    )
                  }
                >
                  <option value="fill">Solid color</option>
                  <option value="gradient">Gradient</option>
                  <option value="image">Image upload</option>
                </select>
              </label>
              <div className="form-grid theme-background-fields">
                {draft.wallpaper_config.type === 'image' ? (
                  <label className="full-width">
                    Wallpaper image
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        validateImage(file)
                        setImageFile(file)
                        setError('')
                        const reader = new FileReader()
                        reader.onload = () => { setImage(String(reader.result)); wallpaper('image', fill, end, String(reader.result)) }
                        reader.readAsDataURL(file)
                      } catch (error) { setError((error as Error).message); e.target.value = '' }
                    }} />
                    <small>Image files up to 5MB. Uploaded when you save.</small>
                  </label>
                ) : (
                  <>
                    <label>
                      {draft.wallpaper_config.type === 'gradient'
                        ? 'Start color'
                        : 'Background color'}
                      <input
                        type="color"
                        value={fill}
                        onChange={(e) => {
                          setFill(e.target.value)
                          wallpaper(draft.wallpaper_config.type, e.target.value)
                        }}
                      />
                    </label>
                    {draft.wallpaper_config.type === 'gradient' && (
                      <label>
                        End color
                        <input
                          type="color"
                          value={end}
                          onChange={(e) => {
                            setEnd(e.target.value)
                            wallpaper('gradient', fill, e.target.value)
                          }}
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
            </section>
            <div className="form-actions">
              <button className="button primary">
                {mutation.isPending
                  ? 'Saving…'
                  : existing
                    ? 'Save theme'
                    : 'Create theme'}
              </button>
            </div>
          </fieldset>
        </form>
        <aside className="theme-live-preview">
          <span className="eyebrow">LIVE PREVIEW</span>
          <ThemePreview theme={draft} />
          <p className="muted">Sample profile · Fonts may vary by device.</p>
        </aside>
      </div>
    </main>
  )
}
