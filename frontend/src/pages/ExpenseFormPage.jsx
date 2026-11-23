import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import MethodPicker from '../components/MethodPicker';
import { expensesApi } from '../services/expensesApi';
import { EXPENSE_CATEGORIES, EXPENSE_MACHINES } from '../utils/constants';
import { todayISO } from '../utils/format';

function blankForm() {
  return {
    date: todayISO(),
    category: EXPENSE_CATEGORIES[0],
    machine: 'General',
    description: '',
    amount: '',
    notes: '',
  };
}

export default function ExpenseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(blankForm);
  const [method, setMethod] = useState('Cash');
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    async function load() {
      try {
        const expense = await expensesApi.get(id);
        if (!cancelled) {
          setForm({
            date: expense.date,
            category: expense.category,
            machine: expense.machine || 'General',
            description: expense.description,
            amount: String(expense.amount),
            notes: expense.notes,
          });
          setMethod(expense.payment_method);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function validate() {
    const found = {};
    if (!form.date) found.date = 'Date is required.';
    if (!form.category) found.category = 'Choose an expense type.';
    if (!(Number(form.amount) > 0)) found.amount = 'Amount must be greater than zero.';
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      date: form.date,
      category: form.category,
      machine: form.machine,
      description: form.description.trim(),
      amount: Number(form.amount),
      payment_method: method,
      notes: form.notes.trim(),
    };

    setSaving(true);
    try {
      if (isEdit) await expensesApi.update(id, payload);
      else await expensesApi.create(payload);
      navigate('/expenses', {
        replace: true,
        state: { flash: isEdit ? 'Expense updated successfully.' : 'Expense saved successfully.' },
      });
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    setSaving(true);
    try {
      await expensesApi.remove(id);
      navigate('/expenses', { replace: true, state: { flash: 'Expense deleted.' } });
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="loading-text">Loading expense…</p>;

  if (loadError) {
    return (
      <section>
        <Link to="/expenses" className="link-back"><ArrowLeft size={16} aria-hidden="true" /> Expenses</Link>
        <div className="alert alert-error" role="alert">{loadError}</div>
      </section>
    );
  }

  return (
    <section>
      <Link to="/expenses" className="link-back">
        <ArrowLeft size={16} aria-hidden="true" /> Expenses
      </Link>
      <PageHeader eyebrow="Money Out" title={isEdit ? 'Edit Expense' : 'Add Expense'} />

      {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

      <form className="card" onSubmit={handleSubmit} noValidate>
        <FormField label="Date" htmlFor="exp-date" error={errors.date}>
          <input id="exp-date" className="input" type="date" value={form.date}
            onChange={(e) => update({ date: e.target.value })} />
        </FormField>

        <FormField label="Expense Type" htmlFor="exp-category" error={errors.category}>
          <select id="exp-category" className="input" value={form.category}
            onChange={(e) => update({ category: e.target.value })}>
            {EXPENSE_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </FormField>

        <FormField label="Machine" htmlFor="exp-machine">
          <select id="exp-machine" className="input" value={form.machine}
            onChange={(e) => update({ machine: e.target.value })}>
            {EXPENSE_MACHINES.map((item) => (
              <option key={item} value={item}>
                {item === 'General' ? 'General (not for a machine)' : item}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Description" htmlFor="exp-desc">
          <input id="exp-desc" className="input" type="text" maxLength={200} value={form.description}
            onChange={(e) => update({ description: e.target.value })} />
        </FormField>

        <FormField label="Amount" htmlFor="exp-amount" error={errors.amount}>
          <div className="input-with-prefix">
            <span className="input-with-prefix__symbol" aria-hidden="true">₹</span>
            <input id="exp-amount" className="input" type="number" inputMode="decimal" step="any" min="0"
              value={form.amount} onChange={(e) => update({ amount: e.target.value })} />
          </div>
        </FormField>

        <div className="field">
          <span className="field__label">Payment Method</span>
          <MethodPicker value={method} onChange={setMethod} />
        </div>

        <FormField label="Notes (optional)" htmlFor="exp-notes">
          <textarea id="exp-notes" className="input textarea" maxLength={300} value={form.notes}
            onChange={(e) => update({ notes: e.target.value })} />
        </FormField>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={18} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save Expense'}
        </button>

        {isEdit && (
          <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }}
            onClick={handleDelete} disabled={saving}>
            <Trash2 size={18} aria-hidden="true" />
            Delete Expense
          </button>
        )}
      </form>
    </section>
  );
}
