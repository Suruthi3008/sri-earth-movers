import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { driversApi } from '../services/driversApi';
import { formatDate, formatINR } from '../utils/format';

export default function DriversPage() {
  const location = useLocation();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.flash || '');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await driversApi.list();
        if (!cancelled) setDrivers(data);
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

  return (
    <section>
      <PageHeader
        eyebrow="Team"
        title="Drivers"
        action={
          <Link to="/drivers/new" className="btn btn-accent new-bill-btn">
            <Plus size={18} aria-hidden="true" />
            Add Driver
          </Link>
        }
      />

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading && <p className="loading-text">Loading drivers…</p>}

      {!loading && !error && drivers.length === 0 && (
        <div className="card empty-state">
          <p>No drivers added yet.</p>
          <Link to="/drivers/new" className="btn btn-primary">Add Driver</Link>
        </div>
      )}

      <div className="list">
        {drivers.map((driver) => (
          <Link key={driver.driver_id} to={`/drivers/${driver.driver_id}/edit`} className="card record-card"
            style={{ '--bar-color': driver.status === 'Active' ? '#16A34A' : '#64748B' }}>
            <div className="record-card__row">
              <div>
                <div className="record-card__title">{driver.name}</div>
                <div className="record-card__meta">{driver.phone || 'No phone'}</div>
              </div>
              <span className={`badge ${driver.status === 'Active' ? 'badge-paid' : 'badge-inactive'}`}>
                {driver.status}
              </span>
            </div>
            <div className="record-card__row record-card__foot">
              <span className="record-card__meta">Salary {formatINR(driver.salary)} / month</span>
              <span className="record-card__meta">
                {driver.joining_date ? `Joined ${formatDate(driver.joining_date)}` : ''}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
