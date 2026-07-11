import {
  canViewFinance,
  loadFinanceBundle,
  resolveOrganisationMembership,
} from '../../services/finance.js';
import { renderFinancePulseRings } from './FinancePulseRings.js';
import {
  renderFinanceKpiGrid,
  renderCollectionStatusCard,
  renderCompletenessIndicator,
  renderTopFamiliesCard,
} from './FinanceMetricCard.js';
import { renderFamilyRevenueChartShell, mountFamilyRevenueChart, destroyFamilyRevenueChart } from './FamilyRevenueChart.js';
import { renderProfitCostDonutShell, mountProfitCostDonut, destroyProfitCostDonut } from './ProfitCostDonut.js';
import { renderMonthlyFinanceTrendShell, mountMonthlyFinanceTrend, destroyMonthlyFinanceTrend } from './MonthlyFinanceTrend.js';
import { renderFinanceFamilyTable, renderFinanceFamilyTableCard } from './FinanceFamilyTable.js';
import { escapeHtml, filterFamilies, sortFamilies } from './utils.js';

const PERIOD_OPTIONS = [
  { key: 'current_month', label: 'Current month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3_months', label: 'Last 3 months' },
  { key: 'ytd', label: 'Year to date' },
];

const SORT_OPTIONS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'cost', label: 'Cost' },
  { key: 'margin', label: 'Margin' },
];

let activeController = null;
let sessionCache = new Map();

function cacheKey(orgId, period) {
  return `${orgId}:${period}`;
}

function renderToolbar(state) {
  return `
    <div class="finance-toolbar">
      <label class="finance-control">
        <span>Period</span>
        <select id="financePeriodSelect" aria-label="Finance time period">
          ${PERIOD_OPTIONS.map((o) => `<option value="${o.key}" ${o.key === state.period ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </label>
      <label class="finance-control">
        <span>Search families</span>
        <input type="search" id="financeFamilySearch" placeholder="Search parent name" value="${escapeHtml(state.search)}" aria-label="Search families">
      </label>
      <label class="finance-control">
        <span>Sort by</span>
        <select id="financeSortSelect" aria-label="Sort families">
          ${SORT_OPTIONS.map((o) => `<option value="${o.key}" ${o.key === state.sort ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </label>
      <button type="button" class="finance-refresh-button" id="financeRefreshButton">Refresh finance data</button>
    </div>`;
}

function renderLoadingShell(mode = 'dashboard') {
  return `
    <section class="finance-analytics-shell" aria-busy="true">
      <div class="finance-section-heading finance-section-heading-compact">
        <div><span class="finance-kicker">Financial pulse</span><h2>Loading finance data…</h2></div>
      </div>
      <div class="finance-skeleton-grid">${Array.from({ length: mode === 'detail' ? 4 : 6 }, () => '<div class="finance-skeleton"></div>').join('')}</div>
    </section>`;
}

function renderRestricted() {
  return `
    <section class="finance-analytics-shell">
      <div class="finance-error-card finance-restricted-card">
        <strong>Finance access restricted</strong>
        <p>Your Nova Org role does not include access to family payment amounts, invoices, or financial analytics. Contact an administrator if you need finance permissions.</p>
      </div>
    </section>`;
}

function renderUnavailable(message) {
  return `
    <section class="finance-analytics-shell">
      <div class="finance-error-card">
        <strong>Finance analytics unavailable</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    </section>`;
}

function renderError(error, retryable = true) {
  return `
    <section class="finance-analytics-shell">
      <div class="finance-error-card">
        <strong>Finance data could not be loaded</strong>
        <p>${escapeHtml(error?.message || 'An unknown error occurred.')}</p>
        ${retryable ? '<button type="button" class="finance-refresh-button" id="financeRetryButton">Try again</button>' : ''}
      </div>
    </section>`;
}

function renderEmptyPlanned() {
  return `
    <section class="finance-analytics-shell">
      <div class="finance-error-card">
        <strong>No planned finance data yet</strong>
        <p>Family fee profiles have not been configured for this organisation. Run the finance migration in Supabase to seed baseline monthly plans.</p>
        <button type="button" class="finance-refresh-button" id="financeRetryButton">Try again</button>
      </div>
    </section>`;
}

function renderDashboard(payload, uiState) {
  const { overview, families, trend } = payload;
  const filtered = sortFamilies(filterFamilies(families, uiState.search), uiState.sort);
  const hasTrend = trend.some((r) => r.invoiced > 0 || r.received > 0);

  return `
    <section class="finance-analytics-shell">
      <div class="finance-section-heading finance-section-heading-compact">
        <div>
          <span class="finance-kicker">Dashboard</span>
          <h2>Financial pulse</h2>
          <p>Planned monthly economics and actual collections from your authenticated Nova Org records.</p>
        </div>
      </div>
      ${renderToolbar(uiState)}
      ${renderFinanceKpiGrid(overview)}
      <div class="finance-bento-grid">
        ${renderFinancePulseRings(overview)}
        ${renderProfitCostDonutShell(overview)}
        ${renderCollectionStatusCard(overview)}
        ${renderCompletenessIndicator(overview)}
        ${renderFamilyRevenueChartShell()}
        ${renderMonthlyFinanceTrendShell(hasTrend)}
        ${renderTopFamiliesCard(filtered)}
      </div>
      ${renderFinanceFamilyTableCard(filtered)}
    </section>`;
}

function renderDetailPanel(payload, uiState) {
  const filtered = sortFamilies(filterFamilies(payload.families, uiState.search), uiState.sort);
  return `
    <section class="finance-analytics-shell finance-detail-shell">
      <div class="finance-section-heading finance-section-heading-compact">
        <div>
          <span class="finance-kicker">Information</span>
          <h2>Finance records</h2>
          <p>Detailed monthly family profiles, invoicing cycles and payment status.</p>
        </div>
      </div>
      ${renderToolbar(uiState)}
      <article class="finance-card finance-table-card">
        <div class="finance-card-header"><div><span class="finance-kicker">Families</span><h3>Monthly finance profiles</h3></div></div>
        ${renderFinanceFamilyTable(filtered)}
      </article>
    </section>`;
}

async function mountCharts(payload, uiState) {
  const filtered = sortFamilies(filterFamilies(payload.families, uiState.search), uiState.sort);
  const hasTrend = payload.trend.some((r) => r.invoiced > 0 || r.received > 0);

  await Promise.all([
    mountFamilyRevenueChart(document.getElementById('familyRevenueChart'), filtered),
    mountProfitCostDonut(document.getElementById('profitCostDonut'), payload.overview),
    hasTrend ? mountMonthlyFinanceTrend(document.getElementById('monthlyFinanceTrend'), payload.trend, payload.overview) : Promise.resolve(),
  ]);
}

function bindToolbar(root, ctx) {
  const period = root.querySelector('#financePeriodSelect');
  const search = root.querySelector('#financeFamilySearch');
  const sort = root.querySelector('#financeSortSelect');
  const refresh = root.querySelector('#financeRefreshButton') || root.querySelector('#financeRetryButton');

  period?.addEventListener('change', () => {
    ctx.uiState.period = period.value;
    ctx.refresh();
  });
  search?.addEventListener('input', () => {
    ctx.uiState.search = search.value;
    ctx.refresh(false);
  });
  sort?.addEventListener('change', () => {
    ctx.uiState.sort = sort.value;
    ctx.refresh(false);
  });
  refresh?.addEventListener('click', () => ctx.refresh(true));
}

function destroyAllCharts() {
  destroyFamilyRevenueChart();
  destroyProfitCostDonut();
  destroyMonthlyFinanceTrend();
}

export async function mountFinanceView({
  root,
  client,
  membership,
  fallbackOrgId,
  mode = 'dashboard',
  uiState = { period: 'current_month', search: '', sort: 'revenue' },
}) {
  if (!root) return null;
  if (activeController) activeController.abort();
  activeController = new AbortController();

  root.innerHTML = renderLoadingShell(mode);

  if (!client) {
    root.innerHTML = renderUnavailable('Sign in with Supabase to load live finance analytics.');
    return null;
  }

  if (!membership?.organisation_id) {
    root.innerHTML = renderUnavailable('No active organisation membership was found for your account.');
    return null;
  }

  if (!canViewFinance(membership.role)) {
    root.innerHTML = renderRestricted();
    return null;
  }

  const orgId = membership.organisation_id || fallbackOrgId;
  const ctx = {
    uiState: { ...uiState },
    async refresh(forceFetch = true) {
      destroyAllCharts();
      if (forceFetch) root.innerHTML = renderLoadingShell(mode);

      try {
        const key = cacheKey(orgId, ctx.uiState.period);
        let payload = forceFetch ? null : sessionCache.get(key);
        if (!payload) {
          payload = await loadFinanceBundle(client, orgId, ctx.uiState.period);
          sessionCache.set(key, payload);
        }

        if (!payload.overview || (payload.overview.plannedRevenue === 0 && !payload.families.length)) {
          root.innerHTML = renderEmptyPlanned();
          bindToolbar(root, ctx);
          return;
        }

        root.innerHTML = mode === 'detail' ? renderDetailPanel(payload, ctx.uiState) : renderDashboard(payload, ctx.uiState);
        bindToolbar(root, ctx);
        if (mode === 'dashboard') await mountCharts(payload, ctx.uiState);
      } catch (error) {
        if (error.name === 'AbortError') return;
        root.innerHTML = renderError(error);
        bindToolbar(root, ctx);
      }
    },
  };

  await ctx.refresh(true);

  return {
    destroy() {
      destroyAllCharts();
      sessionCache.clear();
      activeController?.abort();
    },
    refresh: () => ctx.refresh(true),
  };
}

export async function resolveFinanceContext(client, fallbackOrgId) {
  const { user, membership } = await resolveOrganisationMembership(client, fallbackOrgId);
  return { user, membership, canFinance: membership && canViewFinance(membership.role) };
}

export function clearFinanceSessionCache() {
  sessionCache.clear();
}
