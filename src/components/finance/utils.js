import { GBP, GBP_WHOLE, NUMBER, safeNumber, clampPercent } from '../../services/finance.js';

export { GBP, GBP_WHOLE, NUMBER, safeNumber, clampPercent };

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDay(day, nextMonth = false) {
  const n = safeNumber(day);
  if (n === null) return '—';
  const suffix = n === 1 || n === 21 || n === 31 ? 'st'
    : n === 2 || n === 22 ? 'nd'
      : n === 3 || n === 23 ? 'rd' : 'th';
  return nextMonth ? `${n}${suffix} (following month)` : `${n}${suffix}`;
}

export function sortFamilies(families, sortKey) {
  const list = [...families];
  const keyMap = {
    revenue: 'monthlyRevenue',
    profit: 'monthlyProfit',
    cost: 'monthlyCost',
    margin: 'profitMarginPercent',
  };
  const field = keyMap[sortKey] || 'monthlyRevenue';
  return list.sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
}

export function filterFamilies(families, search) {
  const q = String(search || '').trim().toLowerCase();
  if (!q) return families;
  return families.filter((f) =>
    String(f.parentName || '').toLowerCase().includes(q)
    || String(f.referenceCode || '').toLowerCase().includes(q));
}

let chartModulePromise = null;

export function loadChartJs() {
  if (!chartModulePromise) {
    chartModulePromise = import('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/+esm');
  }
  return chartModulePromise;
}

export function destroyChart(instance) {
  if (instance) {
    instance.destroy();
  }
}
