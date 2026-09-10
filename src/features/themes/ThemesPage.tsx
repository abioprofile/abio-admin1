import { useDebounce } from '@/shared/hooks/useDebounce'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listThemes, deleteTheme } from './themes.api'
import { ThemePreview } from './ThemePreview'
import {
  PageTitle,
  LoadingError,
  Status,
  Modal,
  Feedback,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { date } from '@/shared/lib/display'
export function ThemesPage() {
  const client = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deletion = useMutation({
    mutationFn: deleteTheme,
    onSuccess: async () => {
      setSelectedId(null)
      setConfirmDelete(false)
      await client.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['admin', 'themes'],
    queryFn: ({ signal }) => listThemes(signal),
  })
  const selected = query.data?.find((theme) => theme.id === selectedId)
  const themes = query.data?.filter((theme) =>
    theme.name.toLowerCase().includes(debouncedSearch.toLowerCase().trim()),
  )
  return (
    <main className="dashboard">
      <PageTitle
        title="Themes"
        description="Create a new look for your community’s profile pages."
        action={
          <Link className="button primary" to="/themes/new">
            <Icon name="plus" size={16} />
            Create theme
          </Link>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search themes"
            placeholder="Find a theme"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {query.data && (
          <span className="muted">
            {themes?.length === 1 ? '1 theme' : `${themes?.length} themes`}
          </span>
        )}
      </div>
      <LoadingError
        pending={query.isPending}
        error={query.error}
        retry={query.refetch}
      />
      {themes && (
        <div className="theme-gallery">
          {themes.map((theme) => (
            <button
              className="panel theme-card"
              key={theme.id}
              onClick={() => {
                setSelectedId(theme.id)
                setConfirmDelete(false)
                deletion.reset()
              }}
              aria-label={`Preview ${theme.name}`}
            >
              <ThemePreview theme={theme} compact />
              <div className="theme-card-meta">
                <strong>{theme.name}</strong>
                <Status active={theme.active} />
              </div>
            </button>
          ))}
        </div>
      )}
      {themes?.length === 0 && (
        <section className="panel empty-orders">
          <Icon name="themes" size={30} />
          <h3>
            {search ? 'No matching themes.' : 'Make room for a new look.'}
          </h3>
          <p>
            {search
              ? 'Try another name.'
              : 'Create your first theme to get started.'}
          </p>
        </section>
      )}
      {selected && (
        <Modal
          title={selected.name}
          onClose={() => setSelectedId(null)}
          busy={deletion.isPending}
        >
          <div className="theme-detail">
            <Feedback error={deletion.error} />
            {confirmDelete ? (
              <div className="notice error">
                <p>
                  Delete “{selected.name}”? This cannot be undone. Themes used
                  by profiles cannot be deleted.
                </p>
                <div className="form-actions">
                  <button
                    className="button"
                    disabled={deletion.isPending}
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button danger"
                    disabled={deletion.isPending}
                    onClick={() => deletion.mutate(selected.id)}
                  >
                    {deletion.isPending ? 'Deleting…' : 'Confirm delete'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="form-actions"
                style={{ marginTop: 0, marginBottom: 20 }}
              >
                <Link
                  className="button primary"
                  to="/themes/$id"
                  params={{ id: selected.id }}
                >
                  Edit theme
                </Link>
                <button
                  className="button danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete theme
                </button>
              </div>
            )}

            <ThemePreview theme={selected} />
            <p className="muted">
              Created {date(selected.createdAt)} ·{' '}
              {selected.font_config?.name || 'Default font'}
            </p>
          </div>
        </Modal>
      )}
    </main>
  )
}
