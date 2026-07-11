import { GBP_WHOLE, NUMBER, escapeHtml } from './utils.js';

export function renderFinanceMetricCard({ label, value, note, tone = 'white', loading = false }) {
  if (loading) {
    return `<article class="finance-kpi finance-kpi-skeleton ${tone}"><span>&nbsp;</span><strong>&nbsp;</strong><small>&nbsp;</small></article>`;
  }
  return `
    <article class="finance-kpi ${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note || '')}</small>
    </article>`;
}

export function renderFinanceKpiGrid(overview) {
  const hasInvoices = (overview?.invoicedThisMonth ?? 0) > 0;
  const items = [
    {
      label: 'Planned revenue',
      value: GBP_WHOLE.format(overview?.plannedRevenue ?? 0),
      note: `${overview?.familiesWithPlan ?? 0} family profiles`,
      tone: 'blue',
    },
    {
      label: 'Contribution profit',
      value: GBP_WHOLE.format(overview?.plannedProfit ?? 0),
      note: `${NUMBER.format(overview?.plannedProfitMarginPercent ?? 0)}% margin`,
      tone: 'green',
    },
    {
      label: 'Allocated cost',
      value: GBP_WHOLE.format(overview?.plannedCost ?? 0),
      note: `${NUMBER.format(overview?.plannedCostRatioPercent ?? 0)}% of revenue`,
      tone: 'grey',
    },
    {
      label: hasInvoices ? 'Actual received' : 'Collection status',
      value: hasInvoices ? GBP_WHOLE.format(overview?.receivedThisMonth ?? 0) : 'Not started',
      note: hasInvoices
        ? `${NUMBER.format(overview?.collectionRatePercent ?? 0)}% collected`
        : 'No invoice or payment history has been recorded yet.',
      tone: 'white',
    },
  ];
  return `<div class="finance-kpi-grid">${items.map(renderFinanceMetricCard).join('')}</div>`;
}

export function renderCollectionStatusCard(overview) {
  const invoiced = overview?.invoicedThisMonth ?? 0;
  const received = overview?.receivedThisMonth ?? 0;
  const outstanding = overview?.outstandingTotal ?? 0;
  const hasHistory = invoiced > 0 || received > 0;

  if (!hasHistory) {
    return `
      <article class="finance-card finance-collection-card">
        <div class="finance-card-header">
          <div><span class="finance-kicker">Collections</span><h3>Actual invoiced &amp; received</h3></div>
        </div>
        <div class="finance-empty finance-empty-compact">
          <strong>No invoice or payment history has been recorded yet.</strong>
          <p>Planned revenue and contribution profit are shown separately above. Add invoices and payments to activate collection tracking.</p>
        </div>
        <div class="finance-collection-planned">
          <div><span>Planned revenue</span><strong>${GBP_WHOLE.format(overview?.plannedRevenue ?? 0)}</strong></div>
          <div><span>Contribution profit</span><strong>${GBP_WHOLE.format(overview?.plannedProfit ?? 0)}</strong></div>
        </div>
      </article>`;
  }

  const rate = overview?.collectionRatePercent ?? 0;
  return `
    <article class="finance-card finance-collection-card">
      <div class="finance-card-header">
        <div><span class="finance-kicker">Collections</span><h3>Actual invoiced &amp; received</h3></div>
      </div>
      <div class="finance-collection-grid">
        <div class="finance-collection-stat"><span>Actual invoiced</span><strong>${GBP_WHOLE.format(invoiced)}</strong></div>
        <div class="finance-collection-stat"><span>Actual received</span><strong>${GBP_WHOLE.format(received)}</strong></div>
        <div class="finance-collection-stat"><span>Outstanding</span><strong>${GBP_WHOLE.format(outstanding)}</strong></div>
        <div class="finance-collection-stat highlight"><span>Collection rate</span><strong>${NUMBER.format(rate)}%</strong></div>
      </div>
    </article>`;
}

export function renderCompletenessIndicator(overview) {
  const pct = overview?.feePlanCoveragePercent ?? 0;
  const families = overview?.familiesWithPlan ?? 0;
  const active = overview?.activeFamilies ?? 0;
  return `
    <article class="finance-card finance-completeness-card">
      <div class="finance-card-header">
        <div><span class="finance-kicker">Data quality</span><h3>Finance completeness</h3></div>
      </div>
      <div class="finance-completeness-body">
        <div class="finance-completeness-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Finance profile completeness ${NUMBER.format(pct)} percent">
          <i style="width:${Math.min(100, Math.max(0, pct))}%"></i>
        </div>
        <p><strong>${NUMBER.format(pct)}%</strong> of active families have monthly fee profiles (${families} of ${active}).</p>
      </div>
    </article>`;
}

export function renderTopFamiliesCard(families, limit = 5) {
  const top = families.slice(0, limit);
  if (!top.length) {
    return `
      <article class="finance-card">
        <div class="finance-card-header"><div><span class="finance-kicker">Families</span><h3>Highest-value profiles</h3></div></div>
        <div class="finance-empty">No family fee profiles are available yet.</div>
      </article>`;
  }
  return `
    <article class="finance-card finance-top-families">
      <div class="finance-card-header"><div><span class="finance-kicker">Families</span><h3>Highest-value profiles</h3></div></div>
      <div class="finance-top-list">
        ${top.map((f, i) => `
          <div class="finance-top-row">
            <span class="finance-top-rank">${i + 1}</span>
            <div class="finance-top-main">
              <strong>${escapeHtml(f.parentName)}</strong>
              <span>${escapeHtml(f.referenceCode)} · ${GBP_WHOLE.format(f.monthlyRevenue)} planned</span>
            </div>
            <strong>${GBP_WHOLE.format(f.monthlyProfit)}</strong>
          </div>`).join('')}
      </div>
    </article>`;
}
