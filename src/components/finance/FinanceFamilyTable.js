import { GBP_WHOLE, NUMBER, escapeHtml, formatDay } from './utils.js';

export function renderFinanceFamilyTable(families, options = {}) {
  const { compact = false, showActions = true } = options;

  if (!families.length) {
    return `<div class="finance-empty">No finance records found.</div>`;
  }

  const rows = families.map((row) => `
    <tr data-family-id="${escapeHtml(row.familyId)}">
      <td data-label="Parent"><strong>${escapeHtml(row.parentName)}</strong><small>${escapeHtml(row.referenceCode)}</small></td>
      <td data-label="Planned revenue">${GBP_WHOLE.format(row.monthlyRevenue)}</td>
      <td data-label="Contribution profit"><strong>${GBP_WHOLE.format(row.monthlyProfit)}</strong></td>
      <td data-label="Allocated cost">${GBP_WHOLE.format(row.monthlyCost)}</td>
      <td data-label="Margin"><span class="finance-margin-pill">${NUMBER.format(row.profitMarginPercent)}%</span></td>
      ${compact ? '' : `
        <td data-label="Payment type">${escapeHtml(row.paymentType || '—')}</td>
        <td data-label="Invoice day">${formatDay(row.invoiceDay)}</td>
        <td data-label="Statement day">${formatDay(row.statementDay)}</td>
        <td data-label="Expected payment">${formatDay(row.expectedPaymentDay, row.expectedPaymentNextMonth)}</td>
        <td data-label="Status">${escapeHtml(row.invoiceStatus || row.paymentStatus || 'Planned only')}</td>
      `}
      ${showActions ? `
        <td data-label="Actions" class="finance-row-actions">
          <button type="button" class="finance-link-button" data-finance-invoices="${escapeHtml(row.familyId)}" disabled title="Coming soon">Invoices</button>
          <button type="button" class="finance-link-button" data-finance-payments="${escapeHtml(row.familyId)}" disabled title="Coming soon">Payments</button>
        </td>` : ''}
    </tr>`).join('');

  const headers = compact
    ? ['Parent', 'Planned revenue', 'Contribution profit', 'Allocated cost', 'Margin']
    : ['Parent', 'Planned revenue', 'Contribution profit', 'Allocated cost', 'Margin', 'Payment type', 'Invoice day', 'Statement day', 'Expected payment', 'Status', 'Actions'];

  return `
    <div class="finance-table-wrap">
      <table class="finance-table finance-family-table">
        <thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="finance-mobile-cards" aria-label="Family finance records">
      ${families.map((row) => `
        <article class="finance-mobile-card">
          <h4>${escapeHtml(row.parentName)}</h4>
          <p class="finance-mobile-ref">${escapeHtml(row.referenceCode)}</p>
          <dl>
            <div><dt>Planned revenue</dt><dd>${GBP_WHOLE.format(row.monthlyRevenue)}</dd></div>
            <div><dt>Contribution profit</dt><dd>${GBP_WHOLE.format(row.monthlyProfit)}</dd></div>
            <div><dt>Allocated cost</dt><dd>${GBP_WHOLE.format(row.monthlyCost)}</dd></div>
            <div><dt>Margin</dt><dd>${NUMBER.format(row.profitMarginPercent)}%</dd></div>
            <div><dt>Payment type</dt><dd>${escapeHtml(row.paymentType || '—')}</dd></div>
            <div><dt>Invoice day</dt><dd>${formatDay(row.invoiceDay)}</dd></div>
            <div><dt>Statement day</dt><dd>${formatDay(row.statementDay)}</dd></div>
            <div><dt>Expected payment day</dt><dd>${formatDay(row.expectedPaymentDay, row.expectedPaymentNextMonth)}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(row.invoiceStatus || row.paymentStatus || 'Planned only')}</dd></div>
          </dl>
          <div class="finance-mobile-actions">
            <button type="button" class="finance-link-button" disabled title="Coming soon">View invoices</button>
            <button type="button" class="finance-link-button" disabled title="Coming soon">View payments</button>
          </div>
        </article>`).join('')}
    </div>`;
}

export function renderFinanceFamilyTableCard(families) {
  return `
    <article class="finance-card finance-table-card">
      <div class="finance-card-header">
        <div><span class="finance-kicker">Payment profiles</span><h3>Monthly family figures</h3></div>
      </div>
      ${renderFinanceFamilyTable(families, { compact: false, showActions: true })}
    </article>`;
}
