import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import TotalsSummary from '../components/TotalsSummary';
import { billsApi } from '../services/billsApi';
import { formatDate, formatINR } from '../utils/format';

export default function BillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.flash || '');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await billsApi.get(id);
        if (!cancelled) setBill(data);
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
  }, [id]);

  async function handleDownload() {
    setBusy('pdf');
    setError('');
    setNotice('');
    try {
      await billsApi.downloadPdf(bill.bill_id, bill.bill_number);
      setNotice('Bill PDF generated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this bill? This cannot be undone.')) return;
    setBusy('delete');
    setError('');
    try {
      await billsApi.remove(bill.bill_id);
      navigate('/bills', { replace: true, state: { flash: 'Bill deleted.' } });
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  if (loading) return <p className="loading-text">Loading bill…</p>;

  if (error && !bill) {
    return (
      <section>
        <Link to="/bills" className="link-back"><ArrowLeft size={16} aria-hidden="true" /> Bills</Link>
        <div className="alert alert-error" role="alert">{error}</div>
      </section>
    );
  }

  return (
    <section>
      <Link to="/bills" className="link-back">
        <ArrowLeft size={16} aria-hidden="true" /> Bills
      </Link>

      <PageHeader
        eyebrow={`Bill ${bill.bill_number} • ${formatDate(bill.bill_date)}`}
        title={bill.customer_name}
      />

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="card">
        <div className="bill-card__row">
          <span className="bill-card__meta">Status</span>
          <StatusBadge status={bill.status} />
        </div>
        {bill.project_name && (
          <div className="row-line"><span>Project</span><strong>{bill.project_name}</strong></div>
        )}
        {bill.customer_address && (
          <div className="row-line"><span>Address</span><strong style={{ textAlign: 'right' }}>{bill.customer_address}</strong></div>
        )}
      </div>

      <div className="section-title"><span>Work Items</span></div>
      <div className="stack">
        {bill.items.map((item) => (
          <article key={item.item_id} className="card work-item">
            <div className="work-item__header">
              <h3>{item.description}</h3>
              <span className="bill-card__meta">{formatDate(item.date)}</span>
            </div>
            <div className="row-line"><span>Type</span><strong>{item.work_type}</strong></div>
            <div className="row-line"><span>Quantity</span><strong>{item.quantity} {item.unit}</strong></div>
            <div className="row-line"><span>Rate ({item.quantity} × {formatINR(item.rate)})</span><strong>{formatINR(item.quantity * item.rate)}</strong></div>
            <div className="row-line"><span>Bata</span><strong>{formatINR(item.bata)}</strong></div>
            <div className="work-item__amount">
              <span>Amount</span>
              <strong>{formatINR(item.amount)}</strong>
            </div>
          </article>
        ))}
      </div>

      <TotalsSummary total={bill.total_amount} advance={bill.advance} oldBalance={bill.old_balance} />
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row-line"><span>Received</span><strong>{formatINR(bill.total_paid)}</strong></div>
        <div className="row-line"><span>Pending</span><strong>{formatINR(bill.pending_amount)}</strong></div>
      </div>

      <div className="detail-actions">
        <button type="button" className="btn btn-accent" onClick={handleDownload} disabled={busy !== ''}>
          <Download size={18} aria-hidden="true" />
          {busy === 'pdf' ? 'Generating PDF…' : 'Download Bill PDF'}
        </button>
        <Link to={`/bills/${bill.bill_id}/edit`} className="btn btn-primary">
          <Pencil size={18} aria-hidden="true" />
          Edit Bill
        </Link>
        <button type="button" className="btn btn-ghost" onClick={handleDelete} disabled={busy !== ''}>
          <Trash2 size={18} aria-hidden="true" />
          {busy === 'delete' ? 'Deleting…' : 'Delete Bill'}
        </button>
      </div>
    </section>
  );
}
