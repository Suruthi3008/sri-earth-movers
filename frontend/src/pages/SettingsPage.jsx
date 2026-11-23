import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import { settingsApi } from '../services/settingsApi';

const SECTIONS = [
  {
    title: 'Business Details',
    fields: [
      { key: 'business_name', label: 'Business Name', maxLength: 100 },
      { key: 'business_tagline', label: 'Tagline', maxLength: 100 },
      { key: 'address', label: 'Address', textarea: true, maxLength: 250 },
      { key: 'phone', label: 'Phone', type: 'tel', maxLength: 60 },
      { key: 'email', label: 'Email', type: 'email', maxLength: 120 },
      { key: 'gstin', label: 'GSTIN', maxLength: 15, upper: true },
    ],
  },
  {
    title: 'Bank Details',
    fields: [
      { key: 'bank_account_name', label: 'Account Name', maxLength: 100 },
      { key: 'bank_account_number', label: 'Account Number', inputMode: 'numeric', maxLength: 30 },
      { key: 'bank_ifsc', label: 'IFSC', maxLength: 11, upper: true },
      { key: 'bank_account_type', label: 'Account Type', maxLength: 30 },
      { key: 'gpay', label: 'GPay Number', inputMode: 'tel', maxLength: 20 },
    ],
  },
  {
    title: 'Bill Settings',
    fields: [
      { key: 'jcb_rate', label: 'JCB Rate per Hour (₹)', inputMode: 'decimal', number: true },
      { key: 'default_bata', label: 'Default Bata (₹)', inputMode: 'decimal', number: true },
      { key: 'day_rate', label: 'JCB Rate per Day (₹)', inputMode: 'decimal', number: true },
      { key: 'min_hours_price', label: 'Minimum Charge (₹)', inputMode: 'decimal', number: true },
      { key: 'min_hours_threshold', label: 'Minimum Charge applies up to (hrs)', inputMode: 'decimal', number: true },
      { key: 'bill_number_prefix', label: 'Bill Number Prefix', maxLength: 10, hint: 'Leave blank for 01, 02, …' },
    ],
  },
];

const NUMBER_KEYS = ['jcb_rate', 'default_bata', 'day_rate', 'min_hours_price', 'min_hours_threshold'];

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await settingsApi.get();
        if (!cancelled) setForm(data);
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

  if (loading) return <p className="loading-text">Loading settings…</p>;
  if (loadError || !form) {
    return <div className="alert alert-error" role="alert">{loadError || 'Unable to load settings.'}</div>;
  }

  function update(key, rawValue, upper) {
    const value = upper ? rawValue.toUpperCase() : rawValue;
    setForm((current) => ({ ...current, [key]: value }));
    setNotice('');
  }

  function validate() {
    const found = {};
    if (!String(form.business_name).trim()) found.business_name = 'Business name is required.';
    if (form.jcb_rate === '' || Number(form.jcb_rate) < 0) found.jcb_rate = 'Enter a valid rate.';
    if (form.default_bata === '' || Number(form.default_bata) < 0) found.default_bata = 'Enter a valid bata.';
    return found;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setNotice('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        NUMBER_KEYS.includes(key) ? Number(value) : String(value).trim(),
      ])
    );

    setSaving(true);
    try {
      const saved = await settingsApi.save(payload);
      setForm(saved);
      setNotice('Settings saved successfully.');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <PageHeader eyebrow="Business" title="Settings" />

      {notice && <div className="alert alert-success">{notice}</div>}
      {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="section-title"><span>{section.title}</span></div>
            <div className="card">
              {section.fields.map((field) => {
                const id = `set-${field.key}`;
                const value = form[field.key] ?? '';
                const common = {
                  id,
                  className: 'input',
                  value,
                  onChange: (e) => update(field.key, e.target.value, field.upper),
                  maxLength: field.maxLength,
                  inputMode: field.inputMode,
                };
                return (
                  <FormField key={field.key} label={field.label} htmlFor={id} error={errors[field.key]}>
                    {field.textarea ? (
                      <textarea {...common} className="input textarea" />
                    ) : (
                      <input {...common} type={field.number ? 'number' : field.type || 'text'}
                        step={field.number ? 'any' : undefined} min={field.number ? '0' : undefined} />
                    )}
                    {field.hint && <span className="field__hint">{field.hint}</span>}
                  </FormField>
                );
              })}
            </div>
          </div>
        ))}

        <p className="ledger-note" style={{ marginTop: 12 }}>
          Blank fields use the default value. The business logo is set in backend/app/assets/logo.jpeg.
        </p>

        <button type="submit" className="btn btn-primary" style={{ marginTop: 16 }} disabled={saving}>
          <Save size={18} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </section>
  );
}
