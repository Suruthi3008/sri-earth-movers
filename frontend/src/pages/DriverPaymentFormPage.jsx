import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import { driversApi } from '../services/driversApi';
import { driverPaymentsApi } from '../services/driverPaymentsApi';
import { settingsApi } from '../services/settingsApi';
import { DRIVER_PAYMENT_TYPES } from '../utils/constants';
import { todayISO } from '../utils/format';

export default function DriverPaymentFormPage() {
  const navigate = useNavigate();
  const today = todayISO();

  const [drivers, setDrivers] = useState([]);
  const [defaultBata, setDefaultBata] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'Bata',
    driverId: '',
    workDate: today,
    month: today.slice(0, 7),
    paymentDate: today,
    amount: '',
    status: 'Paid',
    notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [list, settings] = await Promise.all([driversApi.list(), settingsApi.get()]);
        if (!cancelled) {
          setDrivers(list.filter((driver) => driver.status === 'Active'));
          setDefaultBata(settings.default_bata);
          setForm((current) => ({ ...current, amount: settings.default_bata }));
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
  }, []);

  const isSalary = form.type === 'Salary';
  const selectedDriver = drivers.find((d) => d.driver_id === form.driverId);

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  // Bata prefills from Settings; Salary prefills from the driver's monthly salary
  function changeType(type) {
    const amount = type === 'Bata' ? defaultBata : selectedDriver ? String(selectedDriver.salary) : '';
    update({ type, amount });
  }

  function changeDriver(driverId) {
    const driver = drivers.find((d) => d.driver_id === driverId);
    const amount = isSalary && driver ? String(driver.salary) : form.amount;
    update({ driverId, amount });
  }

  function validate() {
    const found = {};
    if (!form.driverId) found.driverId = 'Choose a driver.';
    if (!isSalary && !form.workDate) found.workDate = 'Date is required.';
    if (isSalary && !form.month) found.month = 'Choose the salary month.';
    if (isSalary && !form.paymentDate) found.paymentDate = 'Payment date is required.';
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
      driver_id: form.driverId,
      payment_type: form.type,
      date: isSalary ? form.paymentDate : form.workDate,
      month: isSalary ? form.month : undefined,
      amount: Number(form.amount),
      payment_date: isSalary ? form.paymentDate : form.workDate,
      status: isSalary ? form.status : 'Paid',
      notes: form.notes.trim(),
    };

    setSaving(true);
    try {
      await driverPaymentsApi.create(payload);
      navigate('/driver-payments', {
        replace: true,
        state: { flash: isSalary ? 'Salary saved successfully.' : 'Bata saved successfully.' },
      });
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="loading-text">Loading…</p>;
  if (loadError) {
    return (
      <section>
        <Link to="/driver-payments" className="link-back"><ArrowLeft size={16} aria-hidden="true" /> Driver Payments</Link>
        <div className="alert alert-error" role="alert">{loadError}</div>
      </section>
    );
  }

  return (
    <section>
      <Link to="/driver-payments" className="link-back">
        <ArrowLeft size={16} aria-hidden="true" /> Driver Payments
      </Link>
      <PageHeader eyebrow="Team" title="Add Driver Payment" />

      {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

      {drivers.length === 0 ? (
        <div className="card empty-state">
          <p>No active drivers. Add a driver first.</p>
          <Link to="/drivers/new" className="btn btn-primary">Add Driver</Link>
        </div>
      ) : (
        <form className="card" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <span className="field__label">Payment Type</span>
            <div className="segmented" role="group" aria-label="Payment type">
              {DRIVER_PAYMENT_TYPES.map((type) => (
                <button key={type} type="button"
                  className={`segmented__item${form.type === type ? ' is-active' : ''}`}
                  aria-pressed={form.type === type}
                  onClick={() => changeType(type)}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <FormField label="Driver" htmlFor="dp-driver" error={errors.driverId}>
            <select id="dp-driver" className="input" value={form.driverId}
              onChange={(e) => changeDriver(e.target.value)}>
              <option value="">Select driver</option>
              {drivers.map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>{driver.name}</option>
              ))}
            </select>
          </FormField>

          {!isSalary && (
            <FormField label="Date of Work" htmlFor="dp-work-date" error={errors.workDate}>
              <input id="dp-work-date" className="input" type="date" value={form.workDate}
                onChange={(e) => update({ workDate: e.target.value })} />
            </FormField>
          )}

          {isSalary && (
            <>
              <FormField label="Salary Month" htmlFor="dp-month" error={errors.month}>
                <input id="dp-month" className="input" type="month" value={form.month}
                  onChange={(e) => update({ month: e.target.value })} />
              </FormField>

              <FormField label="Payment Date" htmlFor="dp-pay-date" error={errors.paymentDate}>
                <input id="dp-pay-date" className="input" type="date" value={form.paymentDate}
                  onChange={(e) => update({ paymentDate: e.target.value })} />
              </FormField>

              <div className="field">
                <span className="field__label">Status</span>
                <div className="segmented" role="group" aria-label="Salary status">
                  {['Paid', 'Pending'].map((status) => (
                    <button key={status} type="button"
                      className={`segmented__item${form.status === status ? ' is-active' : ''}`}
                      aria-pressed={form.status === status}
                      onClick={() => update({ status })}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <FormField label="Amount (₹)" htmlFor="dp-amount" error={errors.amount}>
            <input id="dp-amount" className="input" type="number" inputMode="decimal" step="any" min="0"
              value={form.amount} onChange={(e) => update({ amount: e.target.value })} />
          </FormField>

          <FormField label={isSalary ? 'Notes (optional)' : 'Work Done'} htmlFor="dp-notes">
            <textarea id="dp-notes" className="input textarea" maxLength={300} value={form.notes}
              onChange={(e) => update({ notes: e.target.value })} />
          </FormField>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={18} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save Payment'}
          </button>
        </form>
      )}
    </section>
  );
}
