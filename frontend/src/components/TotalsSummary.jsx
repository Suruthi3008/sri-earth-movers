import { formatINR } from '../utils/format';

/**
 * Summary in this order: Advance, Old Balance, Total Balance.
 * Total Balance = Total + Old Balance − Advance (calculated, not typed).
 * Shows only the total when there is no advance and no old balance.
 */
export default function TotalsSummary({ total, advance = 0, oldBalance = 0 }) {
  const paid = Number(advance) || 0;
  const old = Number(oldBalance) || 0;
  if (paid <= 0 && old <= 0) {
    return (
      <div className="card total-card">
        <span>Total Amount</span>
        <strong>{formatINR(total)}</strong>
      </div>
    );
  }
  const totalBalance = Math.round((Number(total) + old - paid) * 100) / 100;
  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="row-line"><span>Advance</span><strong>{formatINR(paid)}</strong></div>
      <div className="row-line"><span>Old Balance</span><strong>{formatINR(old)}</strong></div>
      <div className="row-line"><span>Total Balance</span><strong>{formatINR(totalBalance)}</strong></div>
    </div>
  );
}
