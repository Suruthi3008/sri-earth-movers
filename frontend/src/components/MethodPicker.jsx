import { Banknote, Landmark, MoreHorizontal, Smartphone } from 'lucide-react';
import { PAYMENT_METHODS } from '../utils/constants';

const ICONS = {
  Cash: Banknote,
  'UPI / GPay': Smartphone,
  'Bank Transfer': Landmark,
  Other: MoreHorizontal,
};

export default function MethodPicker({ value, onChange }) {
  return (
    <div className="method-grid" role="group" aria-label="Payment method">
      {PAYMENT_METHODS.map((method) => {
        const Icon = ICONS[method];
        const active = value === method;
        return (
          <button key={method} type="button"
            className={`method-pill${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(method)}>
            <Icon size={18} aria-hidden="true" />
            <span>{method}</span>
          </button>
        );
      })}
    </div>
  );
}
