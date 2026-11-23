import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { STATUS_COLORS } from '../components/StatusBadge';
import StatusBadge from '../components/StatusBadge';
import { billsApi } from '../services/billsApi';
import { formatDate, formatINR } from '../utils/format';

const FILTERS = ['All', 'Pending', 'Partly Paid', 'Paid'];

export default function BillsPage() {
  const location = useLocation();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.flash || '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    // Short delay so typing in search does not send a request on every key
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await billsApi.list({
          q: search.trim(),
          status: filter === 'All' ? '' : filter,
        });
        if (!cancelled) setBills(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, filter]);

  const isFiltered = search.trim() !== '' || filter !== 'All';

  return (
    <section>
      <PageHeader
        eyebrow="Billing"
        title="Bills"
        action={
          <Link to="/bills/new" className="btn btn-accent new-bill-btn">
            <Plus size={18} aria-hidden="true" />
            New Bill
          </Link>
        }
      />

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="toolbar">
        <div className="search">
          <Search size={18} className="search__icon" aria-hidden="true" />
          <input className="input" type="search" placeholder="Search customer or bill number"
            value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search bills" />
        </div>
      </div>

      <div className="chips" role="tablist">
        {FILTERS.map((item) => (
          <button key={item} type="button"
            className={`chip${filter === item ? ' is-active' : ''}`}
            onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>

      {loading && <p className="loading-text">Loading bills…</p>}

      {!loading && !error && bills.length === 0 && (
        <div className="card empty-state">
          {isFiltered ? (
            <p>No bills match your search.</p>
          ) : (
            <>
              <FileText size={36} aria-hidden="true" />
              <h2 className="empty-state__title">No bills yet.</h2>
              <p>Create your first bill to see it here.</p>
              <Link to="/bills/new" className="btn btn-primary">Create Bill</Link>
            </>
          )}
        </div>
      )}

      {!loading && bills.length > 0 && (
        <div className="list">
          {bills.map((bill) => (
            <Link key={bill.bill_id} to={`/bills/${bill.bill_id}`} className="card bill-card"
              style={{ '--bar-color': STATUS_COLORS[bill.status] }}>
              <div className="bill-card__row">
                <div>
                  <div className="bill-card__name">{bill.customer_name}</div>
                  <div className="bill-card__meta">Bill {bill.bill_number} • {formatDate(bill.bill_date)}</div>
                </div>
                <StatusBadge status={bill.status} />
              </div>

              <div className="bill-card__row" style={{ marginTop: 10 }}>
                <span className="bill-card__meta">Total</span>
                <span className="bill-card__amount">{formatINR(bill.total_amount)}</span>
              </div>
              {bill.pending_amount > 0 && (
                <div className="bill-card__pending">Pending {formatINR(bill.pending_amount)}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
