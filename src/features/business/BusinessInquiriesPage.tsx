import { useDebounce } from '@/shared/hooks/useDebounce'
import { errorStatus } from '@/shared/lib/api-error'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { listBusinessInquiries, getBusinessInquiry } from './business.api'
import { PageTitle, LoadingError, Pagination, Modal } from '@/shared/components/Management'
import { Icon } from '@/shared/components/Icon'
import { date } from '@/shared/lib/display'

export function BusinessInquiriesPage() {
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim())
  const [filters, setFilters] = useState({ page: 1, q: '' })
  if (q !== filters.q) setFilters({ page: 1, q })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['admin', 'business-inquiries', filters],
    queryFn: ({ signal }) => listBusinessInquiries(filters.page, filters.q, signal),
  })
  return (
    <main className="dashboard">
      <PageTitle title="Business enquiries" description="Review Grow with Abio requests and the businesses interested in your services."
        action={<button className="button" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Refreshing…' : 'Refresh'}</button>} />
      <div className="toolbar"><div className="search-field">
        <Icon name="search" size={17} />
        <input aria-label="Search business enquiries" placeholder="Company, contact name, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div></div>
      <LoadingError pending={query.isPending} error={query.error} retry={query.refetch} />
      {query.data && <section className="panel">
        <div className="table-scroll">
          <table>
            <thead><tr><th>Company / Contact</th><th>Industry</th><th>Company size</th><th>Submitted</th><th aria-label="Action"></th></tr></thead>
            <tbody>{query.data.inquiries.map((inquiry) => <tr key={inquiry.id}>
              <td><strong>{inquiry.companyName}</strong><p className="muted">{inquiry.fullName}</p><a className="row-link" href={`mailto:${inquiry.email}`}>{inquiry.email}</a></td>
              <td>{inquiry.industry}</td><td>{inquiry.companySize}</td><td>{date(inquiry.createdAt)}</td>
              <td><button className="button" onClick={() => setSelectedId(inquiry.id)} aria-label={`View enquiry from ${inquiry.companyName}`}>View enquiry</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!query.data.inquiries.length && <div className="empty-orders"><Icon name="business" size={30} /><h3>{filters.q ? 'No matching enquiries.' : 'No business enquiries yet.'}</h3><p>{filters.q ? 'Try another company, contact name, or email.' : 'Grow with Abio submissions will appear here, newest first.'}</p></div>}
        <Pagination meta={query.data.pagination} onPage={(page) => setFilters({ ...filters, page })} fetching={query.isFetching} />
      </section>}
      {selectedId && <InquiryDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </main>
  )
}
function InquiryDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ['admin', 'business-inquiry', id],
    queryFn: ({ signal }) => getBusinessInquiry(id, signal),
    retry: false,
    staleTime: 0,
  })
  const selected = query.data
  return <Modal title="Business enquiry" onClose={onClose}>
    {errorStatus(query.error) === 404 ? <p className="notice" role="alert">This business enquiry could not be found. Close this dialog and refresh the list.</p> : <LoadingError pending={query.isPending} error={query.error} retry={query.refetch} />}
    {selected && !query.isError && (
        <dl className="detail-list business-enquiry-details">
          <div><dt>Company</dt><dd>{selected.companyName}</dd></div>
          <div><dt>Contact</dt><dd>{selected.fullName}</dd></div>
          <div><dt>Email</dt><dd><a className="row-link" href={`mailto:${selected.email}`}>{selected.email}</a></dd></div>
          <div><dt>Phone</dt><dd><a className="row-link" href={`tel:${selected.phone}`}>{selected.phone}</a></dd></div>
          <div><dt>Company size</dt><dd>{selected.companySize}</dd></div>
          <div><dt>Industry</dt><dd>{selected.industry}</dd></div>
          <div><dt>Submitted</dt><dd>{date(selected.createdAt)}</dd></div>
          <div><dt>Requested features</dt><dd>{selected.features.length ? <ul>{selected.features.map((feature, index) => <li key={`${index}-${feature}`}>{feature}</li>)}</ul> : 'No features specified.'}</dd></div>
          <div><dt>Submitted by</dt><dd>{selected.user ? <><Link className="row-link" to="/users/$id" params={{ id: selected.user.id }}>{selected.user.name || selected.user.email}</Link><p className="muted">{selected.user.email}</p></> : 'Unavailable'}</dd></div>
          <div><dt>Enquiry ID</dt><dd>{selected.id}</dd></div>
        </dl>
    )}
  </Modal>
}
