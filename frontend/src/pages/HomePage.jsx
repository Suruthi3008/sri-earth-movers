import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Receipt, Wallet } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { dashboardApi } from '../services/dashboardApi';
import { formatDate, formatINR } from '../utils/format';

function RecentList({ title, to, emptyText, isEmpty, children }) {
  return (
    <>
      <div className="section-title">
        <span>{title}</span>
        {to && <Link to={to} className="section-link">See all</Link>}
      </div>
      {isEmpty ? (
        <div className="card empty-state"><p>{emptyText}</p></div>
      ) : (
        <div className="list">{children}</div>
      )}
    </>
  );
}

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await dashboardApi.get();
        if (!cancelled) setData(result);
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

  if (loading) return <p className="loading-text">Loading dashboard…</p>;
  if (error) return <div className="alert alert-error" role="alert">{error}</div>;
  if (!data) return null;

  const isNew =
    data.recent_bills.length === 0 &&
    data.recent_payments.length === 0 &&
    data.recent_expenses.length === 0;

  return (
    <section>
      <PageHeader
        eyebrow="Ramesh Earth Movers"
        title="Home"
        action={<span className="month-chip">{data.month_label}</span>}
      />

      <div className="quick-actions">
        <Link to="/bills/new" className="btn btn-accent">
          <Plus size={18} aria-hidden="true" /> New Bill
        </Link>
        <Link to="/payments" className="btn btn-primary">
          <Wallet size={18} aria-hidden="true" /> Add Payment
        </Link>
        <Link to="/expenses/new" className="btn btn-outline">
          <Receipt size={18} aria-hidden="true" /> Add Expense
        </Link>
      </div>

      <div className="card hero-card">
        <div className="hero-card__label">Income this month (billed)</div>
        <div className="hero-card__amount">{formatINR(data.income)}</div>
        <div className="hero-card__sub">
          Profit:{' '}
          <strong className={data.profit < 0 ? 'text-danger' : 'text-success'}>
            {formatINR(data.profit)}
          </strong>
        </div>
      </div>

      <div className="tiles tiles--two home-tiles">
        <div className="card tile-card">
          <div className="tile__label">Payments Received</div>
          <div className="tile-card__value">{formatINR(data.payments_received)}</div>
          <div className="tile-card__sub">This month</div>
        </div>
        <div className="card tile-card">
          <div className="tile__label">Pending</div>
          <div className="tile-card__value tile-card__value--danger">{formatINR(data.pending)}</div>
          <div className="tile-card__sub">To collect, all bills</div>
        </div>
        <div className="card tile-card">
          <div className="tile__label">Expenses</div>
          <div className="tile-card__value">{formatINR(data.expenses)}</div>
          <div className="tile-card__sub">This month</div>
        </div>
        <div className="card tile-card">
          <div className="tile__label">Profit</div>
          <div className={`tile-card__value ${data.profit < 0 ? 'tile-card__value--danger' : ''}`}>
            {formatINR(data.profit)}
          </div>
          <div className="tile-card__sub">Income − Expenses</div>
        </div>
      </div>

      <div className="section-title"><span>Income by Work</span></div>
      <div className="card">
        <div className="line-item"><span>JCB Work</span><strong>{formatINR(data.income_by_type.jcb_work)}</strong></div>
        <div className="line-item"><span>Lorry Service</span><strong>{formatINR(data.income_by_type.lorry_service)}</strong></div>
        <div className="line-item"><span>Tractor Service</span><strong>{formatINR(data.income_by_type.tractor_service)}</strong></div>
        <div className="line-item"><span>Other Work</span><strong>{formatINR(data.income_by_type.other_work)}</strong></div>
      </div>

      {isNew && (
        <div className="card empty-state" style={{ marginTop: 16 }}>
          <p>No bills yet. Create your first bill to see it here.</p>
          <Link to="/bills/new" className="btn btn-primary">Create Bill</Link>
        </div>
      )}

      <RecentList title="Recent Bills" to="/bills" emptyText="No bills yet." isEmpty={data.recent_bills.length === 0}>
        {data.recent_bills.map((bill) => (
          <Link key={bill.bill_id} to={`/bills/${bill.bill_id}`} className="card record-card"
            style={{ '--bar-color': bill.status === 'Paid' ? '#16A34A' : bill.status === 'Pending' ? '#DC2626' : '#F5A524' }}>
            <div className="record-card__row">
              <div>
                <div className="record-card__title">{bill.customer_name}</div>
                <div className="record-card__meta">Bill {bill.bill_number} • {formatDate(bill.bill_date)}</div>
              </div>
              <div className="record-card__amount">{formatINR(bill.total_amount)}</div>
            </div>
            <div className="record-card__row record-card__foot">
              <StatusBadge status={bill.status} />
              {bill.pending_amount > 0 && (
                <span className="record-card__meta">Pending {formatINR(bill.pending_amount)}</span>
              )}
            </div>
          </Link>
        ))}
      </RecentList>

      <RecentList title="Recent Payments" to="/payments" emptyText="No payments yet." isEmpty={data.recent_payments.length === 0}>
        {data.recent_payments.map((payment) => (
          <article key={payment.payment_id} className="card record-card" style={{ '--bar-color': '#16A34A' }}>
            <div className="record-card__row">
              <div>
                <div className="record-card__title">{payment.customer_name}</div>
                <div className="record-card__meta">{payment.payment_method} • {formatDate(payment.payment_date)}</div>
              </div>
              <div className="record-card__amount">{formatINR(payment.amount)}</div>
            </div>
          </article>
        ))}
      </RecentList>

      <RecentList title="Recent Expenses" to="/expenses" emptyText="No expenses recorded yet." isEmpty={data.recent_expenses.length === 0}>
        {data.recent_expenses.map((expense) => (
          <Link key={expense.expense_id} to={`/expenses/${expense.expense_id}/edit`} className="card record-card"
            style={{ '--bar-color': '#DC2626' }}>
            <div className="record-card__row">
              <div>
                <div className="record-card__title">{expense.category}</div>
                <div className="record-card__meta">{expense.description || 'No description'} • {formatDate(expense.date)}</div>
              </div>
              <div className="record-card__amount">{formatINR(expense.amount)}</div>
            </div>
          </Link>
        ))}
      </RecentList>
    </section>
  );
}
