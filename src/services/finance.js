/** Nova Org finance data service — Supabase only, no hardcoded totals. */

export const FINANCE_ROLES = new Set(['owner', 'admin', 'manager', 'finance']);

export const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export const GBP_WHOLE = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
export const NUMBER = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });
export const UK_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function safeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function clampPercent(value) {
  const n = safeNumber(value);
  if (n === null) return 0;
  return Math.min(100, Math.max(0, n));
}

export function canViewFinance(role) {
  return FINANCE_ROLES.has(String(role || '').toLowerCase());
}

function mapOverview(row) {
  if (!row) return null;
  return {
    organisationId: row.organisation_id,
    familiesWithPlan: safeNumber(row.families_with_plan) ?? 0,
    activeFamilies: safeNumber(row.active_families) ?? 0,
    plannedRevenue: safeNumber(row.planned_revenue) ?? 0,
    plannedCost: safeNumber(row.planned_cost) ?? 0,
    plannedProfit: safeNumber(row.planned_profit) ?? 0,
    plannedProfitMarginPercent: safeNumber(row.planned_profit_margin_percent) ?? 0,
    plannedCostRatioPercent: safeNumber(row.planned_cost_ratio_percent) ?? 0,
    feePlanCoveragePercent: safeNumber(row.fee_plan_coverage_percent) ?? 0,
    invoicedThisMonth: safeNumber(row.invoiced_this_month) ?? 0,
    receivedThisMonth: safeNumber(row.received_this_month) ?? 0,
    outstandingTotal: safeNumber(row.outstanding_total) ?? 0,
    collectionRatePercent: safeNumber(row.collection_rate_percent) ?? 0,
    actualExpensesThisMonth: safeNumber(row.actual_expenses_this_month) ?? 0,
    actualProfitThisMonth: safeNumber(row.actual_profit_this_month) ?? 0,
  };
}

function mapFamily(row) {
  return {
    familyId: row.family_id,
    referenceCode: row.reference_code,
    parentName: row.parent_name,
    paymentType: row.payment_type,
    currency: row.currency,
    monthlyRevenue: safeNumber(row.monthly_revenue) ?? 0,
    monthlyCost: safeNumber(row.monthly_cost) ?? 0,
    monthlyProfit: safeNumber(row.monthly_profit) ?? 0,
    profitMarginPercent: safeNumber(row.profit_margin_percent) ?? 0,
    effectiveFrom: row.effective_from,
    invoiceDay: row.invoice_day,
    statementDay: row.statement_day,
    expectedPaymentDay: row.expected_payment_day,
    expectedPaymentNextMonth: row.expected_payment_next_month,
    invoiceStatus: row.invoice_status,
    paymentStatus: row.payment_status,
  };
}

function mapTrend(row) {
  return {
    month: row.month,
    invoiced: safeNumber(row.invoiced) ?? 0,
    received: safeNumber(row.received) ?? 0,
    outstanding: safeNumber(row.outstanding) ?? 0,
  };
}

async function query(client, table, organisationId, options = {}) {
  let q = client.from(table).select(options.select || '*').eq('organisation_id', organisationId);
  if (options.order) {
    Object.entries(options.order).forEach(([col, asc]) => {
      q = q.order(col, { ascending: asc });
    });
  }
  if (options.gte) {
    Object.entries(options.gte).forEach(([col, val]) => {
      q = q.gte(col, val);
    });
  }
  if (options.lte) {
    Object.entries(options.lte).forEach(([col, val]) => {
      q = q.lte(col, val);
    });
  }
  const { data, error } = options.single ? await q.maybeSingle() : await q;
  if (error) {
    const err = new Error(error.message || 'Finance query failed');
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
  return data;
}

export function getPeriodRange(periodKey) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (periodKey === 'last_month') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0),
    };
  }
  if (periodKey === 'last_3_months') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      end,
    };
  }
  if (periodKey === 'ytd') {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end,
    };
  }
  return { start, end };
}

export async function resolveOrganisationMembership(client, fallbackOrgId) {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) return { user: null, membership: null };

  const { data, error } = await client
    .from('organisation_members')
    .select('organisation_id, role, active')
    .eq('user_id', user.id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return { user, membership: data || null };
}

export async function getFinanceDashboardOverview(client, organisationId) {
  const row = await query(client, 'finance_dashboard_overview', organisationId, { single: true });
  return mapOverview(row);
}

export async function getFamilyFinanceSummary(client, organisationId) {
  const rows = await query(client, 'finance_family_summary', organisationId, {
    order: { monthly_revenue: false },
  });
  const familyRows = await query(client, 'families', organisationId, {
    select: 'id, invoice_day, statement_day, expected_payment_day, expected_payment_next_month, payment_type',
  });
  const familyMeta = new Map((familyRows || []).map((f) => [f.id, f]));

  return (rows || []).map((row) => {
    const meta = familyMeta.get(row.family_id) || {};
    return mapFamily({
      ...row,
      invoice_day: meta.invoice_day,
      statement_day: meta.statement_day,
      expected_payment_day: meta.expected_payment_day,
      expected_payment_next_month: meta.expected_payment_next_month,
      payment_type: row.payment_type || meta.payment_type,
    });
  });
}

export async function getMonthlyFinanceTrend(client, organisationId, periodKey = 'ytd') {
  const { start } = getPeriodRange(periodKey);
  const rows = await query(client, 'finance_monthly_trend', organisationId, {
    order: { month: true },
    gte: { month: start.toISOString().slice(0, 10) },
  });
  return (rows || []).map(mapTrend);
}

export async function getInvoices(client, organisationId, familyId) {
  const opts = { order: { issue_date: false } };
  let rows = await query(client, 'invoice_balances', organisationId, opts);
  if (familyId) rows = (rows || []).filter((r) => r.family_id === familyId);
  return rows || [];
}

export async function getPayments(client, organisationId, familyId) {
  const opts = { order: { paid_at: false } };
  let rows = await query(client, 'payments', organisationId, opts);
  if (familyId) rows = (rows || []).filter((r) => r.family_id === familyId);
  return rows || [];
}

export async function getExpenses(client, organisationId) {
  const rows = await query(client, 'expenses', organisationId, {
    order: { expense_date: false },
  });
  return rows || [];
}

export async function loadFinanceBundle(client, organisationId, periodKey = 'current_month') {
  const trendPeriod = periodKey === 'current_month' ? 'ytd' : periodKey;
  const [overview, families, trend] = await Promise.all([
    getFinanceDashboardOverview(client, organisationId),
    getFamilyFinanceSummary(client, organisationId),
    getMonthlyFinanceTrend(client, organisationId, trendPeriod),
  ]);
  return { overview, families, trend, periodKey };
}
