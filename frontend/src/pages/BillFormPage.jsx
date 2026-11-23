import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import TotalsSummary from '../components/TotalsSummary';
import WorkItemCard from '../components/WorkItemCard';
import { billsApi } from '../services/billsApi';
import { settingsApi } from '../services/settingsApi';
import {
  applyWorkType,
  billTotal,
  formFromBill,
  hasErrors,
  newBillForm,
  newWorkItem,
  toPayload,
  validateBill,
} from '../utils/billForm';
import { formatINR } from '../utils/format';

export default function BillFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [defaults, setDefaults] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load Settings (default JCB rate and bata) and, when editing, the existing bill
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const settings = await settingsApi.get();
        const loadedDefaults = {
          jcbRate: settings.jcb_rate,
          defaultBata: settings.default_bata,
          dayRate: settings.day_rate,
          minHoursPrice: settings.min_hours_price,
          minHoursThreshold: settings.min_hours_threshold,
        };
        const loadedForm = isEdit
          ? formFromBill(await billsApi.get(id))
          : newBillForm(loadedDefaults);
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
        <Link to="/bills" className="link-back"><ArrowLeft size={16} aria-hidden="true" /> Bills</Link>
        <div className="alert alert-error" role="alert">{loadError || 'Unable to open this bill.'}</div>
      </section>
    );
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateItem(itemId, patch) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  }

  function changeWorkType(itemId, workType) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? applyWorkType(item, workType, defaults) : item
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, newWorkItem(defaults, current.billDate)],
    }));
  }

  function removeItem(itemId) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const found = validateBill(form, defaults);
    setErrors(found);
    if (hasErrors(found)) {
      setSubmitError('Please fix the highlighted fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(form);
      const saved = isEdit
        ? await billsApi.update(id, payload)
        : await billsApi.create(payload);
      navigate(`/bills/${saved.bill_id}`, {
        replace: true,
        state: { flash: isEdit ? 'Bill updated successfully.' : 'Bill saved successfully.' },
      });
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  }

  const total = billTotal(form.items, defaults);

  return (
    <section>
      <Link to={isEdit ? `/bills/${id}` : '/bills'} className="link-back">
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </Link>

      <PageHeader eyebrow="Billing" title={isEdit ? 'Edit Bill' : 'New Bill'} />

      {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="card">
          <FormField label="Bill Date" htmlFor="bill-date" error={errors.billDate}>
            <input id="bill-date" className="input" type="date" value={form.billDate}
              onChange={(e) => updateField('billDate', e.target.value)} />
          </FormField>

          <FormField label="Customer Name" htmlFor="customer-name" error={errors.customerName}>
            <input id="customer-name" className="input" type="text" maxLength={120} value={form.customerName}
              onChange={(e) => updateField('customerName', e.target.value)} />
          </FormField>

          <FormField label="Customer Address" htmlFor="customer-address">
            <textarea id="customer-address" className="input textarea" maxLength={300}
              value={form.customerAddress} onChange={(e) => updateField('customerAddress', e.target.value)} />
          </FormField>

          <FormField label="Project Name (optional)" htmlFor="project-name">
            <input id="project-name" className="input" type="text" maxLength={120} value={form.projectName}
              onChange={(e) => updateField('projectName', e.target.value)} />
          </FormField>
        </div>

        <div className="section-title"><span>Work Items</span></div>

        <div className="stack">
          {form.items.map((item, index) => (
            <WorkItemCard
              key={item.id}
              item={item}
              index={index}
              errors={errors.itemErrors?.[index] || {}}
              onChange={(patch) => updateItem(item.id, patch)}
              onWorkTypeChange={(type) => changeWorkType(item.id, type)}
              onRemove={() => removeItem(item.id)}
              canRemove={form.items.length > 1}
              cfg={defaults}
            />
          ))}
        </div>

        {errors.items && <p className="field__error" role="alert">{errors.items}</p>}

        <button type="button" className="btn btn-ghost add-work-btn" onClick={addItem}>
          <Plus size={18} aria-hidden="true" />
          Add Another Work
        </button>

        <div className="card" style={{ marginTop: 8 }}>
          <FormField label="Advance (₹)" htmlFor="advance" error={errors.advance}>
            <input id="advance" className="input" type="number" inputMode="decimal" step="any" min="0"
              value={form.advance} onChange={(e) => updateField('advance', e.target.value)} />
          </FormField>
          <FormField label="Old Balance (₹)" htmlFor="old-balance" error={errors.oldBalance}>
            <input id="old-balance" className="input" type="number" inputMode="decimal" step="any" min="0"
              value={form.oldBalance} onChange={(e) => updateField('oldBalance', e.target.value)} />
          </FormField>
        </div>

        <TotalsSummary total={total} advance={Number(form.advance) || 0} oldBalance={Number(form.oldBalance) || 0} />

        <button type="submit" className="btn btn-primary save-bill-btn" disabled={saving}>
          <Save size={18} aria-hidden="true" />
          {saving ? 'Saving bill…' : 'Save Bill'}
        </button>
      </form>
    </section>
  );
}
