import { Trash2 } from 'lucide-react';
import FormField from './FormField';
import {
  LORRY_MATERIALS,
  UNIT_OPTIONS,
  WORK_TYPES,
  defaultRateFor,
  lineAmount,
  minimumApplies,
} from '../utils/billForm';
import { formatINR } from '../utils/format';

/** One work item as a stacked card, so it works on a phone without a wide table. */
export default function WorkItemCard({
  item,
  index,
  cfg,
  errors = {},
  onChange,
  onWorkTypeChange,
  onRemove,
  canRemove,
}) {
  const id = item.id;
  const isLorry = item.workType === 'Lorry Service';
  const isJcb = item.workType === 'JCB Work';
  const isTractor = item.workType === 'Tractor Service';

  function changeUnit(unit) {
    const patch = { unit };
    if (isJcb) patch.rate = defaultRateFor('JCB Work', unit, cfg);
    onChange(patch);
  }

  return (
    <article className="card work-item">
      <div className="work-item__header">
        <h3>Work Item {index + 1}</h3>
        <button type="button" className="icon-btn icon-btn--danger" onClick={onRemove}
          disabled={!canRemove} aria-label={`Remove work item ${index + 1}`}>
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>

      <FormField label="Work Type" htmlFor={`${id}-type`} error={errors.workType}>
        <select id={`${id}-type`} className="input" value={item.workType}
          onChange={(e) => onWorkTypeChange(e.target.value)}>
          {WORK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </FormField>

      {isLorry && (
        <FormField label="Material" htmlFor={`${id}-material`} error={errors.material}>
          <select id={`${id}-material`} className="input" value={item.material}
            onChange={(e) => onChange({ material: e.target.value })}>
            <option value="">Select material</option>
            {LORRY_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </FormField>
      )}

      {item.workType === 'Other Work' && (
        <FormField label="Description" htmlFor={`${id}-desc`} error={errors.description}>
          <input id={`${id}-desc`} className="input" type="text" maxLength={200} value={item.description}
            onChange={(e) => onChange({ description: e.target.value })} />
        </FormField>
      )}

      <div className="grid-2">
        <FormField label="Date" htmlFor={`${id}-date`} error={errors.date}>
          <input id={`${id}-date`} className="input" type="date" value={item.date}
            onChange={(e) => onChange({ date: e.target.value })} />
        </FormField>

        <FormField label="Quantity" htmlFor={`${id}-qty`} error={errors.quantity}>
          <input id={`${id}-qty`} className="input" type="number" inputMode="decimal" step="any" min="0"
            value={item.quantity} onChange={(e) => onChange({ quantity: e.target.value })} />
        </FormField>
      </div>

      <FormField label="Unit" htmlFor={`${id}-unit`} error={errors.unit}>
        <select id={`${id}-unit`} className="input" value={item.unit} onChange={(e) => changeUnit(e.target.value)}>
          {(UNIT_OPTIONS[item.workType] || []).map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {minimumApplies(item, cfg) && (
          <span className="field__hint">
            Minimum charge applies: {formatINR(cfg.minHoursPrice)} (up to {cfg.minHoursThreshold} hrs)
          </span>
        )}
      </FormField>

      <div className="grid-2">
        <FormField label={isJcb ? 'Rate (₹ per unit)' : 'Rate (₹)'} htmlFor={`${id}-rate`} error={errors.rate}>
          <input id={`${id}-rate`} className="input" type="number" inputMode="decimal" step="any" min="0"
            value={item.rate} placeholder={isLorry || isTractor ? 'Enter rate' : ''}
            onChange={(e) => onChange({ rate: e.target.value })} />
        </FormField>

        <FormField label="Bata (₹)" htmlFor={`${id}-bata`} error={errors.bata}>
          <input id={`${id}-bata`} className="input" type="number" inputMode="decimal" step="any" min="0"
            value={item.bata} onChange={(e) => onChange({ bata: e.target.value })} />
        </FormField>
      </div>

      <div className="work-item__amount">
        <span>Amount</span>
        <strong>{formatINR(lineAmount(item, cfg))}</strong>
      </div>
    </article>
  );
}
