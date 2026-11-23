import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { expensesApi } from '../services/expensesApi';
import { EXPENSE_CATEGORIES } from '../utils/constants';
import { formatDate, formatINR } from '../utils/format';

const FILTERS = ['All', ...EXPENSE_CATEGORIES];

export default function ExpensesPage() {
  const location = useLocation();
  const [category, setCategory] = useState('All');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.flash || '');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await expensesApi.list(category === 'All' ? '' : category);
        if (!cancelled) setExpenses(data);
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
  }, [category]);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <section>
      <PageHeader
        eyebrow="Money Out"
        title="Expenses"
        action={
          <Link to="/expenses/new" className="btn btn-accent new-bill-btn">
            <Plus size={18} aria-hidden="true" />
            Add Expense
          </Link>
        }
      />

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="chips" role="tablist">
        {FILTERS.map((item) => (
          <button key={item} type="button"
            className={`chip${category === item ? ' is-active' : ''}`}
            onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </div>

      {loading && <p className="loading-text">Loading expenses…</p>}

      {!loading && !error && expenses.length === 0 && (
        <div className="card empty-state">
          <p>No expenses recorded yet.</p>
          <Link to="/expenses/new" className="btn btn-primary">Add Expense</Link>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <>
          <div className="card total-card">
            <span>Total {category === 'All' ? '' : category}</span>
            <strong>{formatINR(total)}</strong>
          </div>

          <div className="list" style={{ marginTop: 12 }}>
            {expenses.map((expense) => (
              <Link key={expense.expense_id} to={`/expenses/${expense.expense_id}/edit`}
                className="card record-card" style={{ '--bar-color': '#DC2626' }}>
                <div className="record-card__row">
                  <div>
                    <div className="record-card__title">{expense.category}</div>
                    <div className="record-card__meta">
                      {expense.machine !== 'General' ? `${expense.machine} • ` : ''}{expense.description || 'No description'} • {formatDate(expense.date)}
                    </div>
                  </div>
                  <div className="record-card__amount">{formatINR(expense.amount)}</div>
                </div>
                <div className="record-card__meta record-card__foot">{expense.payment_method}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
