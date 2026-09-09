import { date } from '@/shared/lib/display'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { management } from '@/features/admin/api/management.api'
import {
  PageTitle,
  LoadingError,
  Pagination,
  Status,
} from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
export function UsersPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    page: 1,
    q: '',
    active: '',
    hasBadge: '',
  })
  const query = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: ({ signal }) =>
      management.users(
        {
          ...filters,
          q: filters.q || undefined,
          active: filters.active || undefined,
          hasBadge: filters.hasBadge || undefined,
        },
        signal,
      ),
  })
  return (
    <main className="dashboard">
      <PageTitle
        title="Users"
        description="The people behind your community. Manage access and verification."
      />
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setFilters({ ...filters, page: 1, q: search.trim() })
        }}
      >
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search users"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="button">Search</button>
        <select
          aria-label="Account status"
          value={filters.active}
          onChange={(e) =>
            setFilters({ ...filters, page: 1, active: e.target.value })
          }
        >
          <option value="">All accounts</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          aria-label="Verification status"
          value={filters.hasBadge}
          onChange={(e) =>
            setFilters({ ...filters, page: 1, hasBadge: e.target.value })
          }
        >
          <option value="">All badges</option>
          <option value="true">Verified</option>
          <option value="false">Not verified</option>
        </select>
      </form>
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
                  <th>User</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Badge</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link
                        className="row-link"
                        to="/users/$id"
                        params={{ id: user.id }}
                      >
                        {user.name || user.email}
                      </Link>
                      <p className="muted">{user.email}</p>
                    </td>
                    <td>{user.roles.join(', ') || 'User'}</td>
                    <td>{date(user.createdAt)}</td>
                    <td>
                      <Status active={user.active} />
                    </td>
                    <td>
                      {user.hasBadge ? (
                        <span className="badge success">Verified</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <Link
                        className="button"
                        to="/users/$id"
                        params={{ id: user.id }}
                      >
                        View user
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.users.length && (
            <div className="empty-orders">
              <h3>No users found.</h3>
              <p>Try changing your search or filters.</p>
            </div>
          )}
          <Pagination
            meta={query.data.pagination}
            onPage={(page) => setFilters({ ...filters, page })}
            fetching={query.isFetching}
          />
        </section>
      )}
    </main>
  )
}
