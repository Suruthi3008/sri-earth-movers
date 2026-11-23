/** Bill form helpers: line math (incl. minimum charge), validation and conversion to/from the API shape. */
import { todayISO } from './format';

export const WORK_TYPES = ['JCB Work', 'Lorry Service', 'Tractor Service', 'Other Work'];

export const LORRY_MATERIALS = [
  'M Sand', 'P Sand', 'Hill Soil', 'Gravel Soil', 'Lake Soil', '1/2 Stone', '1/4 Stone', 'Black Stone',
];

export const UNIT_OPTIONS = {
  'JCB Work': ['hrs', 'day'],
  'Lorry Service': ['Ton', 'Unit', 'CFT', 'Load'],
  'Tractor Service': ['Hours', 'Trip', 'Load'],
  'Other Work': ['job'],
};

// Default unit per work type (used by Daily Work and as the starting unit on bills)
export const UNITS = {
  'JCB Work': 'hrs',
  'Lorry Service': 'Load',
  'Tractor Service': 'Hours',
  'Other Work': 'job',
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * cfg (from Settings): jcbRate, dayRate, defaultBata, minHoursPrice, minHoursThreshold.
 * Backend is the source of truth; these functions only show the same numbers while typing.
 */

/** JCB hours at or below the threshold cost the minimum charge. */
export function minimumApplies(item, cfg) {
  return (
    item.workType === 'JCB Work' &&
    item.unit !== 'day' &&
    Number(item.quantity) > 0 &&
    Number(item.quantity) <= Number(cfg?.minHoursThreshold)
  );
}

/** Base charge before bata: minimum charge, or quantity × rate. */
export function lineBase(item, cfg) {
  if (minimumApplies(item, cfg)) return round2(cfg.minHoursPrice);
  return round2((Number(item.quantity) || 0) * (Number(item.rate) || 0));
}

/** Mirrors backend: base + bata. Safe to call without cfg (Daily Work preview). */
export function lineAmount(item, cfg) {
  return round2(lineBase(item, cfg) + (Number(item.bata) || 0));
}

export function billTotal(items, cfg) {
  return round2(items.reduce((sum, item) => sum + lineAmount(item, cfg), 0));
}

/** Rate that a JCB unit starts with: per hour, or per day. Other types are entered by hand. */
export function defaultRateFor(workType, unit, cfg) {
  if (workType !== 'JCB Work') return '';
  return unit === 'day' ? (cfg?.dayRate ?? '') : (cfg?.jcbRate ?? '');
}

let sequence = 0;
// crypto.randomUUID is unavailable on plain http:// LAN addresses, so use a counter
const nextId = () => `item-${Date.now()}-${sequence++}`;

export function newWorkItem(cfg, date) {
  return {
    id: nextId(),
    date,
    workType: 'JCB Work',
    material: '',
    description: '',
    unit: UNITS['JCB Work'],
    quantity: '',
    rate: cfg.jcbRate ?? '',
    bata: cfg.defaultBata ?? '',
  };
}

export function applyWorkType(item, workType, cfg) {
  const isJcb = workType === 'JCB Work';
  return {
    ...item,
    workType,
    material: '',
    unit: UNITS[workType],
    rate: isJcb ? defaultRateFor(workType, UNITS[workType], cfg) : '',
    bata: isJcb ? (cfg.defaultBata ?? '') : '',
  };
}

export function newBillForm(cfg) {
  const today = todayISO();
  return {
    billDate: today,
    customerName: '',
    customerAddress: '',
    projectName: '',
    advance: '',
    oldBalance: '',
    items: [newWorkItem(cfg, today)],
  };
}

export function formFromBill(bill) {
  return {
    billDate: bill.bill_date,
    customerName: bill.customer_name,
    customerAddress: bill.customer_address || '',
    projectName: bill.project_name || '',
    advance: bill.advance ? String(bill.advance) : '',
    oldBalance: bill.old_balance ? String(bill.old_balance) : '',
    items: bill.items.map((item) => ({
      id: `saved-${item.item_id}`,
      date: item.date,
      workType: item.work_type,
      material: item.work_type === 'Lorry Service' ? item.description : '',
      description: item.work_type === 'Lorry Service' ? '' : item.description,
      unit: item.unit,
      quantity: String(item.quantity),
      rate: String(item.rate),
      bata: String(item.bata),
    })),
  };
}

export function validateBill(form, cfg) {
  const errors = {};
  if (!form.billDate) errors.billDate = 'Bill date is required.';
  if (!form.customerName.trim()) errors.customerName = 'Customer name is required.';
  if (form.items.length === 0) errors.items = 'Add at least one work item.';

  const itemErrors = form.items.map((item) => {
    const found = {};
    if (!item.workType) found.workType = 'Work type is required.';
    if (!item.date) found.date = 'Date is required.';
    if (item.workType === 'Lorry Service' && !LORRY_MATERIALS.includes(item.material)) {
      found.material = 'Choose a material.';
    }
    if (!(UNIT_OPTIONS[item.workType] || []).includes(item.unit)) found.unit = 'Choose a unit.';
    if (item.workType === 'Other Work' && !item.description.trim()) {
      found.description = 'Description is required.';
    }
    if (!(Number(item.quantity) > 0)) found.quantity = 'Quantity must be greater than zero.';
    if (item.rate === '') found.rate = 'Enter the rate.';
    else if (Number(item.rate) < 0) found.rate = 'Rate cannot be negative.';
    if (item.bata !== '' && Number(item.bata) < 0) found.bata = 'Bata cannot be negative.';
    return found;
  });

  if (itemErrors.some((found) => Object.keys(found).length > 0)) errors.itemErrors = itemErrors;
  const total = billTotal(form.items, cfg);
  if (!errors.items && total <= 0) errors.items = 'The bill total must be more than zero.';

  const advance = Number(form.advance) || 0;
  const oldBalance = Number(form.oldBalance) || 0;
  if (advance < 0) errors.advance = 'Advance cannot be negative.';
  else if (advance > total) errors.advance = 'Advance cannot be more than the total.';
  if (oldBalance < 0) errors.oldBalance = 'Old balance cannot be negative.';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

export function toPayload(form) {
  return {
    bill_date: form.billDate,
    customer_name: form.customerName.trim(),
    customer_address: form.customerAddress.trim(),
    project_name: form.projectName.trim(),
    advance: Number(form.advance) || 0,
    old_balance: Number(form.oldBalance) || 0,
    items: form.items.map((item) => ({
      date: item.date,
      work_type: item.workType,
      material: item.workType === 'Lorry Service' ? item.material : '',
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit: item.unit,
      rate: Number(item.rate),
      bata: item.bata === '' ? 0 : Number(item.bata),
    })),
  };
}
