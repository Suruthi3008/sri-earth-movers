import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { dailyWorkApi } from '../services/dailyWorkApi';
import { WORK_TYPES } from '../utils/billForm';
import { formatDate, formatINR } from '../utils/format';

const FILTERS = ['All', ...WORK_TYPES];

export default function DailyWorkPage() {
  const location = useLocation();
  const [filter, setFilter] = useState('All');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.flash || '');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await dailyWorkApi.list(filter === 'All' ? '' : filter);
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <section>
      <PageHeader
        eyebrow="Work Log"
        title="Daily Work"
        action={
          <Link to="/daily-work/new" className="btn btn-accent new-bill-btn">
            <Plus size={18} aria-hidden="true" />
            Add Work
          </Link>
        }
      />

      <p className="ledger-note">This is a work log. To charge a customer, create a bill.</p>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="chips" role="tablist">
        {FILTERS.map((item) => (
          <button key={item} type="button"
            className={`chip${filter === item ? ' is-active' : ''}`}
            onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>

      {loading && <p className="loading-text">Loading work log…</p>}

      {!loading && !error && entries.length === 0 && (
        <div className="card empty-state">
          <p>No work entries yet.</p>
          <Link to="/daily-work/new" className="btn btn-primary">Add Work</Link>
        </div>
      )}

      <div className="list">
        {entries.map((entry) => (
          <Link key={entry.work_id} to={`/daily-work/${entry.work_id}/edit`}
            className="card record-card" style={{ '--bar-color': '#64748B' }}>
            <div className="record-card__row">
              <div>
                <div className="record-card__title">{entry.customer_name}</div>
                <div className="record-card__meta">{entry.work_type} • {formatDate(entry.date)}</div>
              </div>
              <div className="record-card__amount">{formatINR(entry.amount)}</div>
            </div>
            <div className="record-card__meta record-card__foot">
              {entry.description} • {entry.quantity} {entry.unit}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
