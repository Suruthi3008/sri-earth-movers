import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import FormField from './FormField';
import MethodPicker from './MethodPicker';
import { paymentsApi } from '../services/paymentsApi';
import { formatINR, todayISO } from '../utils/format';

function blankForm() {
  return {
    customer: '',
    billId: '',
    paymentDate: todayISO(),
    amount: '',
    reference: '',
    notes: '',
  };
}

/** openBills: bills with status other than Paid, from GET /api/bills */
export default function PaymentForm({ openBills, onSaved }) {
  const [form, setForm] = useState(blankForm);
  const [method, setMethod] = useState('Cash');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const customers = useMemo(
    () => [...new Set(openBills.map((bill) => bill.customer_name))].sort(),
    [openBills]
  );
  const customerBills = useMemo(
    () => openBills.filter((bill) => bill.customer_name === form.customer),
    [openBills, form.customer]
  );
  const selectedBill = openBills.find((bill) => bill.bill_id === form.billId);
  const pending = selectedBill ? selectedBill.pending_amount : 0;
  const amount = Number(form.amount) || 0;
  const remaining = Math.max(pending - amount, 0);

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function validate() {
    const found = {};
    if (!form.customer) found.customer = 'Choose a customer.';
    if (!form.billId) found.billId = 'Choose a bill.';
    if (!form.paymentDate) found.paymentDate = 'Payment date is required.';
    if (!(amount > 0)) {
      found.amount = 'Payment amount must be greater than zero.';
    } else if (selectedBill && amount > pending) {
      found.amount = `Amount is more than the pending ${formatINR(pending)}.`;
    }
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const saved = await paymentsApi.create({
        bill_id: form.billId,
        payment_date: form.paymentDate,
        amount,
        payment_method: method,
        reference_number: form.reference.trim(),
        notes: form.notes.trim(),
      });
      setForm(blankForm());
      setErrors({});
      onSaved(`Payment of ${formatINR(saved.amount)} added successfully.`);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (openBills.length === 0) {
    return (
      <div className="card empty-state">
        <p>No pending bills. Create a bill first to record a payment.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <div className="card-title">Record Payment</div>

      {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

      <FormField label="Customer Name" htmlFor="pay-customer" error={errors.customer}>
        <select id="pay-customer" className="input" value={form.customer}
          onChange={(e) => update({ customer: e.target.value, billId: '' })}>
          <option value="">Select customer</option>
          {customers.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </FormField>

      <FormField label="Bill Number & Balance" htmlFor="pay-bill" error={errors.billId}>
        <select id="pay-bill" className="input" value={form.billId} disabled={!form.customer}
          onChange={(e) => update({ billId: e.target.value })}>
          <option value="">Select bill</option>
          {customerBills.map((bill) => (
            <option key={bill.bill_id} value={bill.bill_id}>
              Bill {bill.bill_number} • Pending {formatINR(bill.pending_amount)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Payment Date" htmlFor="pay-date" error={errors.paymentDate}>
        <input id="pay-date" className="input" type="date" value={form.paymentDate}
          onChange={(e) => update({ paymentDate: e.target.value })} />
      </FormField>

      <FormField label="Amount Received" htmlFor="pay-amount" error={errors.amount}>
        <div className="input-with-prefix">
          <span className="input-with-prefix__symbol" aria-hidden="true">₹</span>
          <input id="pay-amount" className="input" type="number" inputMode="decimal" step="any" min="0"
            value={form.amount} onChange={(e) => update({ amount: e.target.value })} />
        </div>
      </FormField>

      {selectedBill && (
        <div className="amount-helper">
          <span>Remaining pending</span>
          <strong>{formatINR(remaining)}</strong>
        </div>
      )}

      <div className="field" style={{ marginTop: 16 }}>
        <span className="field__label">Payment Method</span>
        <MethodPicker value={method} onChange={setMethod} />
      </div>

      <FormField label="Reference / Transaction ID (optional)" htmlFor="pay-ref">
        <input id="pay-ref" className="input" type="text" maxLength={60} value={form.reference}
          onChange={(e) => update({ reference: e.target.value })} />
      </FormField>

      <FormField label="Notes (optional)" htmlFor="pay-notes">
        <textarea id="pay-notes" className="input textarea" maxLength={300} value={form.notes}
          onChange={(e) => update({ notes: e.target.value })} />
      </FormField>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        <Save size={18} aria-hidden="true" />
        {saving ? 'Saving payment…' : 'Save Payment'}
      </button>
    </form>
  );
}
