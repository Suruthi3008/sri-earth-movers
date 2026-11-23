import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { driverPaymentsApi } from '../services/driverPaymentsApi';
import { formatDate, formatINR } from '../utils/format';

export default function DriverPaymentsPage() {
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.flash || '');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [summaryData, list] = await Promise.all([
        driverPaymentsApi.summary(),
        driverPaymentsApi.list(),
      ]);
      setSummary(summaryData);
      setPayments(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid(paymentId) {
    setBusyId(paymentId);
    setError('');
    try {
      await driverPaymentsApi.updateStatus(paymentId, 'Paid');
      setNotice('Salary marked as paid.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Team"
        title="Driver Payments"
        action={
          <Link to="/driver-payments/new" className="btn btn-accent new-bill-btn">
            <Plus size={18} aria-hidden="true" />
            Add Payment
          </Link>
        }
      />

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading && <p className="loading-text">Loading driver payments…</p>}

      {summary && (
        <div className="tiles tiles--two">
          <div className="card tile-card">
            <div className="tile__label">Bata This Month</div>
            <div className="tile-card__value">{formatINR(summary.bata_this_month)}</div>
            <div className="tile-card__sub">{summary.month_label}</div>
          </div>
          <div className="card tile-card">
            <div className="tile__label">Salary Pending</div>
            <div className="tile-card__value tile-card__value--danger">
              {formatINR(summary.salary_pending)}
            </div>
            <div className="tile-card__sub">
              {summary.salary_pending_count} {summary.salary_pending_count === 1 ? 'payment' : 'payments'}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && payments.length === 0 && (
        <div className="card empty-state" style={{ marginTop: 16 }}>
          <p>No driver payments recorded yet.</p>
          <Link to="/driver-payments/new" className="btn btn-primary">Add Payment</Link>
        </div>
      )}

      <div className="section-title"><span>Recent Payments</span></div>
      <div className="list">
        {payments.map((payment) => {
          const isPendingSalary = payment.payment_type === 'Salary' && payment.status === 'Pending';
          return (
            <article key={payment.payment_id} className="card record-card"
              style={{ '--bar-color': isPendingSalary ? '#DC2626' : '#16A34A' }}>
              <div className="record-card__row">
                <div>
                  <div className="record-card__title">{payment.driver_name}</div>
                  <div className="record-card__meta">
                    {payment.payment_type === 'Salary'
                      ? `Salary • ${payment.month}`
                      : `Bata • ${formatDate(payment.date)}`}
                  </div>
                </div>
                <div className="record-card__amount">{formatINR(payment.amount)}</div>
              </div>
              {payment.notes && <div className="record-card__meta record-card__foot">{payment.notes}</div>}
              <div className="record-card__row record-card__foot">
                <span className={`badge ${isPendingSalary ? 'badge-pending' : 'badge-paid'}`}>
                  {payment.status}
                </span>
                {isPendingSalary && (
                  <button type="button" className="btn btn-primary btn-compact"
                    onClick={() => markPaid(payment.payment_id)} disabled={busyId === payment.payment_id}>
                    <Check size={16} aria-hidden="true" />
                    {busyId === payment.payment_id ? 'Saving…' : 'Mark as Paid'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
