import { useDebounce } from '@/shared/hooks/useDebounce'
import { safeUrl } from '@/shared/lib/display'
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
import { formatKobo } from '@/shared/lib/money'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ page: 1, q: '', active: '' })
  const q = useDebounce(search.trim())
  if (q !== filters.q) setFilters({ ...filters, q, page: 1 })
  const query = useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: ({ signal }) =>
      management.products(
        {
          ...filters,
          q: filters.q || undefined,
          active: filters.active || undefined,
        },
        signal,
      ),
  })
  return (
    <main className="dashboard">
      <PageTitle
        title="Products"
        description="Keep your catalog fresh and your shelves ready."
        action={
          <Link className="button primary" to="/products/new">
            <Icon name="plus" size={16} />
            Add product
          </Link>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" size={17} />
          <input
            aria-label="Search products"
            placeholder="Search name or slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Product status"
          value={filters.active}
          onChange={(e) =>
            setFilters({ ...filters, page: 1, active: e.target.value })
          }
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
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
                  <th>Product</th>
                  <th>Type</th>
                  <th>Base price</th>
                  <th>Variants</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {query.data.products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb">
                          {safeUrl(product.variants[0]?.imageUrls[0]) ? (
                            <img
                              src={safeUrl(product.variants[0]?.imageUrls[0])}
                              alt=""
                            />
                          ) : (
                            <Icon name="products" />
                          )}
                        </div>
                        <div>
                          <Link
                            className="row-link"
                            to="/products/$id"
                            params={{ id: product.id }}
                          >
                            {product.name}
                          </Link>
                          <p className="muted">/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="capitalize">{product.type}</td>
                    <td>
                      {product.currency === 'NGN'
                        ? formatKobo(product.basePriceKobo)
                        : `${product.currency} ${(product.basePriceKobo / 100).toFixed(2)}`}
                    </td>
                    <td>{product.variants.length}</td>
                    <td>
                      <Status active={product.active} />
                    </td>
                    <td>
                      <Link
                        className="button"
                        to="/products/$id"
                        params={{ id: product.id }}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {query.data.products.length === 0 && (
            <div className="empty-orders">
              <Icon name="products" size={28} />
              <h3>No products found.</h3>
              <p>Add your first product or try a different search.</p>
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
