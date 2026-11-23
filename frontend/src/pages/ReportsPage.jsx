import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { reportsApi } from '../services/reportsApi';
import { formatINR, todayISO } from '../utils/format';

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

function Row({ label, value, strong = false, tone }) {
  return (
    <div className={`line-item${strong ? ' line-item--total' : ''}`}>
      <span>{label}</span>
      <strong className={tone ? `text-${tone}` : ''}>{formatINR(value)}</strong>
    </div>
  );
}

export default function ReportsPage() {
  const [preset, setPreset] = useState('month');
  const [range, setRange] = useState({ start: todayISO(), end: todayISO() });
  const [applied, setApplied] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeError, setRangeError] = useState('');

  useEffect(() => {
    if (preset === 'custom' && !applied) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = preset === 'custom' ? { preset, ...applied } : { preset };
    reportsApi
      .get(params)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preset, applied]);

  function applyCustom() {
    setRangeError('');
    if (!range.start || !range.end) {
      setRangeError('Choose both a start date and an end date.');
      return;
    }
    if (range.end < range.start) {
      setRangeError('The end date must be on or after the start date.');
      return;
    }
    setApplied({ ...range });
  }

  return (
    <section>
      <PageHeader eyebrow="Business" title="Reports" />

      <div className="chips" role="tablist">
        {PRESETS.map((item) => (
          <button key={item.value} type="button"
            className={`chip${preset === item.value ? ' is-active' : ''}`}
            onClick={() => setPreset(item.value)}>
            {item.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="card custom-range">
          <div className="grid-2">
            <div className="field">
              <label className="field__label" htmlFor="rep-start">From</label>
              <input id="rep-start" className="input" type="date" value={range.start}
                onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="rep-end">To</label>
              <input id="rep-end" className="input" type="date" value={range.end}
                onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
            </div>
          </div>
          {rangeError && <p className="field__error" role="alert">{rangeError}</p>}
          <button type="button" className="btn btn-primary" onClick={applyCustom}>Show Report</button>
        </div>
      )}

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {loading && <p className="loading-text">Loading report…</p>}

      {preset === 'custom' && !applied && !loading && (
        <div className="card empty-state"><p>Choose dates and tap Show Report.</p></div>
      )}

      {report && !loading && (
        <>
          <p className="ledger-note">Period: {report.period.label}</p>

          <div className="section-title"><span>Bills</span></div>
          <div className="card">
            <div className="line-item"><span>Total Bills</span><strong>{report.bills.count}</strong></div>
            <Row label="Total Billed" value={report.bills.total_billed} />
            <Row label="Payments Received" value={report.bills.payments_received} />
            <Row label="Pending Payments" value={report.bills.pending} tone="danger" />
          </div>

          <div className="section-title"><span>Income</span></div>
          <div className="card">
            <Row label="JCB Work" value={report.income.jcb_work} />
            <Row label="Lorry Service" value={report.income.lorry_service} />
            <Row label="Tractor Service" value={report.income.tractor_service} />
            <Row label="Other Work" value={report.income.other_work} />
            <Row label="Total Income" value={report.income.total} strong />
          </div>

          <div className="section-title"><span>Expenses</span></div>
          <div className="card">
            <Row label="Diesel" value={report.expenses.diesel} />
            <Row label="Driver Bata" value={report.expenses.driver_bata} />
            <Row label="Driver Salary" value={report.expenses.driver_salary} />
            <Row label="Maintenance" value={report.expenses.maintenance} />
            <Row label="Repairs" value={report.expenses.repairs} />
            <Row label="Spare Parts" value={report.expenses.spare_parts} />
            <Row label="Other" value={report.expenses.other} />
            <Row label="Total Expenses" value={report.expenses.total} strong />
          </div>

          <div className="section-title"><span>Expenses by Machine</span></div>
          {report.machines.map((m) => (
            <div key={m.name} className="card" style={{ marginBottom: 12 }}>
              <div className="line-item line-item--total">
                <span>{m.name}</span>
                <strong>{formatINR(m.total)}</strong>
              </div>
              <Row label="Diesel" value={m.diesel} />
              <Row label="Maintenance & Repairs" value={m.maintenance} />
              <Row label="Other" value={m.other} />
            </div>
          ))}

          <div className="section-title"><span>Result</span></div>
          <div className="card result-card">
            <Row label="Income" value={report.result.income} />
            <Row label="Expenses" value={report.result.expenses} />
            <div className="line-item line-item--total">
              <span>Profit</span>
              <strong className={report.result.profit < 0 ? 'text-danger' : 'text-success'}>
                {formatINR(report.result.profit)}
              </strong>
            </div>
          </div>

          <p className="ledger-note" style={{ marginTop: 12 }}>
            Income is billed work. Payments Received is cash in the period, shown separately.
          </p>
        </>
      )}
    </section>
  );
}
