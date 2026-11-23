import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import { dailyWorkApi } from '../services/dailyWorkApi';
import { settingsApi } from '../services/settingsApi';
import { applyWorkType, lineAmount, UNITS, WORK_TYPES } from '../utils/billForm';
import { formatINR, todayISO } from '../utils/format';

function blankForm(defaults) {
  return {
    date: todayISO(),
    customerName: '',
    workType: 'JCB Work',
    description: '',
    unit: UNITS['JCB Work'],
    quantity: '',
    rate: defaults.jcbRate ?? '',
    bata: defaults.defaultBata ?? '',
    notes: '',
  };
}

export default function DailyWorkFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [defaults, setDefaults] = useState({});
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const settings = await settingsApi.get();
        const loadedDefaults = { jcbRate: settings.jcb_rate, defaultBata: settings.default_bata };
        let loadedForm = blankForm(loadedDefaults);
        if (isEdit) {
          const entry = await dailyWorkApi.get(id);
          loadedForm = {
            date: entry.date,
            customerName: entry.customer_name,
            workType: entry.work_type,
            description: entry.description,
            unit: entry.unit,
            quantity: String(entry.quantity),
            rate: String(entry.rate),
            bata: String(entry.bata),
            notes: entry.notes,
          };
        }
        if (!cancelled) {
          setDefaults(loadedDefaults);
          setForm(loadedForm);
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

  if (loading) return <p className="loading-text">Loading…</p>;
  if (loadError || !form) {
    return (
      <section>
        <Link to="/daily-work" className="link-back"><ArrowLeft size={16} aria-hidden="true" /> Daily Work</Link>
        <div className="alert alert-error" role="alert">{loadError || 'Unable to open this entry.'}</div>
      </section>
    );
  }

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function changeWorkType(workType) {
    setForm((current) => applyWorkType(current, workType, defaults));
  }

  function validate() {
    const found = {};
    if (!form.date) found.date = 'Date is required.';
    if (!form.customerName.trim()) found.customerName = 'Customer name is required.';
    if (form.workType === 'Other Work' && !form.description.trim()) {
      found.description = 'Description is required.';
    }
    if (!(Number(form.quantity) > 0)) found.quantity = 'Quantity must be greater than zero.';
    if (form.rate === '') found.rate = 'Enter the rate.';
    else if (Number(form.rate) < 0) found.rate = 'Rate cannot be negative.';
    if (form.bata !== '' && Number(form.bata) < 0) found.bata = 'Bata cannot be negative.';
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
      customer_name: form.customerName.trim(),
      work_type: form.workType,
      description: form.description.trim(),
      quantity: Number(form.quantity),
      unit: form.unit,
      rate: Number(form.rate),
      bata: form.bata === '' ? 0 : Number(form.bata),
      notes: form.notes.trim(),
    };

    setSaving(true);
    try {
      if (isEdit) await dailyWorkApi.update(id, payload);
      else await dailyWorkApi.create(payload);
      navigate('/daily-work', {
        replace: true,
        state: { flash: isEdit ? 'Work entry updated.' : 'Work entry saved successfully.' },
      });
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this work entry? This cannot be undone.')) return;
    setSaving(true);
    try {
      await dailyWorkApi.remove(id);
      navigate('/daily-work', { replace: true, state: { flash: 'Work entry deleted.' } });
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  }

  const preview = lineAmount(form);

  return (
    <section>
      <Link to="/daily-work" className="link-back">
        <ArrowLeft size={16} aria-hidden="true" /> Daily Work
      </Link>
      <PageHeader eyebrow="Work Log" title={isEdit ? 'Edit Work' : 'Add Work'} />

      {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

      <form className="card" onSubmit={handleSubmit} noValidate>
        <FormField label="Date" htmlFor="dw-date" error={errors.date}>
          <input id="dw-date" className="input" type="date" value={form.date}
            onChange={(e) => update({ date: e.target.value })} />
        </FormField>

        <FormField label="Customer Name" htmlFor="dw-customer" error={errors.customerName}>
          <input id="dw-customer" className="input" type="text" maxLength={120} value={form.customerName}
            onChange={(e) => update({ customerName: e.target.value })} />
        </FormField>

        <FormField label="Work Type" htmlFor="dw-type">
          <select id="dw-type" className="input" value={form.workType}
            onChange={(e) => changeWorkType(e.target.value)}>
            {WORK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </FormField>

        <FormField label={form.workType === 'Other Work' ? 'Description' : 'Description (optional)'}
          htmlFor="dw-desc" error={errors.description}>
          <input id="dw-desc" className="input" type="text" maxLength={200} value={form.description}
            onChange={(e) => update({ description: e.target.value })} />
        </FormField>

        <div className="grid-2">
          <FormField label={`Quantity (${form.unit})`} htmlFor="dw-qty" error={errors.quantity}>
            <input id="dw-qty" className="input" type="number" inputMode="decimal" step="any" min="0"
              value={form.quantity} onChange={(e) => update({ quantity: e.target.value })} />
          </FormField>
          <FormField label="Rate (₹)" htmlFor="dw-rate" error={errors.rate}>
            <input id="dw-rate" className="input" type="number" inputMode="decimal" step="any" min="0"
              value={form.rate} onChange={(e) => update({ rate: e.target.value })} />
          </FormField>
        </div>

        <FormField label="Bata (₹)" htmlFor="dw-bata" error={errors.bata}>
          <input id="dw-bata" className="input" type="number" inputMode="decimal" step="any" min="0"
            value={form.bata} onChange={(e) => update({ bata: e.target.value })} />
        </FormField>

        <FormField label="Notes (optional)" htmlFor="dw-notes">
          <textarea id="dw-notes" className="input textarea" maxLength={300} value={form.notes}
            onChange={(e) => update({ notes: e.target.value })} />
        </FormField>

        <div className="work-item__amount">
          <span>Amount</span>
          <strong>{formatINR(preview)}</strong>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }} disabled={saving}>
          <Save size={18} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save Work'}
        </button>

        {isEdit && (
          <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }}
            onClick={handleDelete} disabled={saving}>
            <Trash2 size={18} aria-hidden="true" />
            Delete Entry
          </button>
        )}
      </form>
    </section>
  );
}
