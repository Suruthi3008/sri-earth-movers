import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import { driversApi } from '../services/driversApi';

export default function DriverFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', phone: '', salary: '', joiningDate: '', status: 'Active' });
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
        // The driver list is short, so a single-driver endpoint is not needed
        const drivers = await driversApi.list();
        const driver = drivers.find((d) => d.driver_id === id);
        if (!driver) throw new Error('Driver not found.');
        if (!cancelled) {
          setForm({
            name: driver.name,
            phone: driver.phone,
            salary: String(driver.salary),
            joiningDate: driver.joining_date || '',
            status: driver.status,
          });
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

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');

    const found = {};
    if (!form.name.trim()) found.name = 'Driver name is required.';
    if (form.salary !== '' && Number(form.salary) < 0) found.salary = 'Salary cannot be negative.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      salary: form.salary === '' ? 0 : Number(form.salary),
      joining_date: form.joiningDate || null,
      status: form.status,
    };

    setSaving(true);
    try {
      if (isEdit) await driversApi.update(id, payload);
      else await driversApi.create(payload);
      navigate('/drivers', {
        replace: true,
        state: { flash: isEdit ? 'Driver updated.' : 'Driver added successfully.' },
      });
    } catch (err) {
      setSubmitError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <p className="loading-text">Loading driver…</p>;
  if (loadError) {
    return (
      <section>
        <Link to="/drivers" className="link-back"><ArrowLeft size={16} aria-hidden="true" /> Drivers</Link>
        <div className="alert alert-error" role="alert">{loadError}</div>
      </section>
    );
  }

  return (
    <section>
      <Link to="/drivers" className="link-back">
        <ArrowLeft size={16} aria-hidden="true" /> Drivers
      </Link>
      <PageHeader eyebrow="Team" title={isEdit ? 'Edit Driver' : 'Add Driver'} />

      {submitError && <div className="alert alert-error" role="alert">{submitError}</div>}

      <form className="card" onSubmit={handleSubmit} noValidate>
        <FormField label="Driver Name" htmlFor="drv-name" error={errors.name}>
          <input id="drv-name" className="input" type="text" maxLength={100} value={form.name}
            onChange={(e) => update({ name: e.target.value })} />
        </FormField>

        <FormField label="Phone" htmlFor="drv-phone">
          <input id="drv-phone" className="input" type="tel" inputMode="tel" maxLength={20} value={form.phone}
            onChange={(e) => update({ phone: e.target.value })} />
        </FormField>

        <FormField label="Monthly Salary (₹)" htmlFor="drv-salary" error={errors.salary}>
          <input id="drv-salary" className="input" type="number" inputMode="decimal" step="any" min="0"
            value={form.salary} onChange={(e) => update({ salary: e.target.value })} />
        </FormField>

        <FormField label="Joining Date" htmlFor="drv-joined">
          <input id="drv-joined" className="input" type="date" value={form.joiningDate}
            onChange={(e) => update({ joiningDate: e.target.value })} />
        </FormField>

        <FormField label="Status" htmlFor="drv-status">
          <select id="drv-status" className="input" value={form.status}
            onChange={(e) => update({ status: e.target.value })}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </FormField>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={18} aria-hidden="true" />
          {saving ? 'Saving…' : 'Save Driver'}
        </button>
      </form>
    </section>
  );
}
