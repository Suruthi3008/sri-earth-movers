import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PaymentForm from '../components/PaymentForm';
import { STATUS_COLORS } from '../components/StatusBadge';
import { billsApi } from '../services/billsApi';
import { paymentsApi } from '../services/paymentsApi';
import { formatDate, formatINR } from '../utils/format';

export default function PaymentsPage() {
  const [summary, setSummary] = useState(null);
  const [openBills, setOpenBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [summaryData, bills, recent] = await Promise.all([
        paymentsApi.summary(),
        billsApi.list({}),
        paymentsApi.list(),
      ]);
      setSummary(summaryData);
      setOpenBills(bills.filter((bill) => bill.status !== 'Paid'));
      setPayments(recent);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(message) {
    setNotice(message);
    load();
  }

  function scrollToForm() {
    document.getElementById('add-payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section>
      <PageHeader
        eyebrow="Accounts & Settlements"
        title="Payments"
        action={summary && <span className="month-chip">{summary.month_label}</span>}
      />

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading && <p className="loading-text">Loading payments…</p>}

      {summary && (
        <>
          <div className="card">
            <div className="hero-card__label">This Month Received</div>
            <div className="hero-card__amount">{formatINR(summary.month_received)}</div>
            <div className="hero-card__sub">
              Pending collection: <strong>{formatINR(summary.pending_collection)}</strong>
              {' • '}
              {summary.unpaid_bills} unpaid {summary.unpaid_bills === 1 ? 'bill' : 'bills'}
            </div>
          </div>

          <button type="button" className="btn btn-accent add-payment-btn" onClick={scrollToForm}>
            <Plus size={18} aria-hidden="true" />
            Add Payment
          </button>

          <div id="add-payment">
            <PaymentForm openBills={openBills} onSaved={handleSaved} />
          </div>

          <div className="section-title"><span>Monthly Ledger</span></div>
          <div className="card">
            <p className="ledger-note">Bills dated {summary.month_label}</p>
            <div className="tiles">
              <div className="tile">
                <div className="tile__label">Bill Amount</div>
                <div className="tile__value">{formatINR(summary.ledger_bill_amount)}</div>
              </div>
              <div className="tile">
                <div className="tile__label">Paid</div>
                <div className="tile__value">{formatINR(summary.ledger_paid)}</div>
              </div>
              <div className="tile">
                <div className="tile__label">Pending</div>
                <div className="tile__value tile__value--danger">{formatINR(summary.ledger_pending)}</div>
              </div>
            </div>
          </div>

          <div className="section-title"><span>Recent Payment Receipts</span></div>
          {payments.length === 0 && (
            <div className="card empty-state"><p>No payments yet.</p></div>
          )}
          <div className="list">
            {payments.map((payment) => (
              <article key={payment.payment_id} className="card record-card"
                style={{
                  '--bar-color': payment.bill_status === 'Paid'
                    ? STATUS_COLORS.Paid
                    : STATUS_COLORS['Partly Paid'],
                }}>
                <div className="record-card__row">
                  <div>
                    <div className="record-card__title">{payment.customer_name}</div>
                    <div className="record-card__meta">
                      Bill {payment.bill_number} • {formatDate(payment.payment_date)}
                    </div>
                  </div>
                  <div className="record-card__amount">{formatINR(payment.amount)}</div>
                </div>
                <div className="record-card__row record-card__foot">
                  <span className="record-card__meta">{payment.payment_method}</span>
                  <span className="record-card__meta">
                    {payment.bill_status === 'Paid' ? 'Full settlement' : 'Partly paid'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
