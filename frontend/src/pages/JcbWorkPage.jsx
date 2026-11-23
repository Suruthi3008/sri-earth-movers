import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { jcbApi } from '../services/jcbApi';
import { formatDate, formatINR } from '../utils/format';

export default function JcbWorkPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await jcbApi.summary();
        if (!cancelled) setSummary(data);
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
  }, []);

  return (
    <section>
      <PageHeader
        eyebrow="Machines"
        title="JCB Work"
        action={
          <Link to="/bills/new" className="btn btn-accent new-bill-btn">
            <Plus size={18} aria-hidden="true" />
            New Bill
          </Link>
        }
      />

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading && <p className="loading-text">Loading JCB work…</p>}

      {summary && (
        <>
          <div className="tiles tiles--two">
            <div className="card tile-card">
              <div className="tile__label">This Month's Hours</div>
              <div className="tile-card__value">{summary.hours.toLocaleString('en-IN')} hrs</div>
              <div className="tile-card__sub">{summary.month_label}</div>
            </div>
            <div className="card tile-card">
              <div className="tile__label">This Month's Income</div>
              <div className="tile-card__value">{formatINR(summary.income)}</div>
              <div className="tile-card__sub">Billed JCB work</div>
            </div>
          </div>
          <p className="ledger-note" style={{ marginTop: 12 }}>
            Both JCB machines are counted together.
          </p>

          <div className="section-title"><span>Recent JCB Work</span></div>

          {summary.recent.length === 0 && (
            <div className="card empty-state">
              <p>No JCB work billed yet.</p>
              <Link to="/bills/new" className="btn btn-primary">Create Bill</Link>
            </div>
          )}

          <div className="list">
            {summary.recent.map((item) => (
              <Link key={item.item_id} to="/bills" className="card record-card"
                style={{ '--bar-color': '#F5A524' }}>
                <div className="record-card__row">
                  <div>
                    <div className="record-card__title">{item.customer_name}</div>
                    <div className="record-card__meta">
                      Bill {item.bill_number} • {formatDate(item.date)}
                    </div>
                  </div>
                  <div className="record-card__amount">{formatINR(item.amount)}</div>
                </div>
                <div className="record-card__meta record-card__foot">
                  {item.quantity} {item.unit}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
