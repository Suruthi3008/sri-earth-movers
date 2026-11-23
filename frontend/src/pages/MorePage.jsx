import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, LogOut } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { downloadExcel } from '../services/exportApi';
import { ApiError } from '../services/api';

const SECTIONS = [
  { name: 'JCB Work', to: '/jcb-work' },
  { name: 'Daily Work', to: '/daily-work' },
  { name: 'Expenses', to: '/expenses' },
  { name: 'Driver Payments', to: '/driver-payments' },
  { name: 'Drivers', to: '/drivers' },
  { name: 'Reports', to: '/reports' },
  { name: 'Settings', to: '/settings' },
];

export default function MorePage() {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await downloadExcel();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to download the Excel file.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section>
      <PageHeader eyebrow="Ramesh Earth Movers" title="More" />

      <div className="card menu-card">
        {SECTIONS.map(({ name, to }) => (
          <Link key={name} to={to} className="menu-row">
            <span>{name}</span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)' }}>
          Download all records as an Excel file (read-only copy).
        </p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <button type="button" className="btn btn-accent" onClick={handleExport} disabled={exporting}>
          <Download size={18} aria-hidden="true" />
          {exporting ? 'Preparing file…' : 'Download Excel'}
        </button>
      </div>

          <div className="card">
        <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)' }}>
          Logged in as <strong>{user?.username}</strong>
        </p>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          <LogOut size={18} aria-hidden="true" />
          Log Out
        </button>
      </div>
    </section>
  );
}
