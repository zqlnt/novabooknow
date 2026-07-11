-- Nova Org finance extension for Supabase
-- Assumption: the supplied figures are monthly baseline projections effective 1 July 2026.
-- Revenue and allocated cost are stored; profit is generated as revenue - cost.

begin;

-- Finance roles are deliberately narrower than general organisation membership.
create or replace function public.can_view_finance(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organisation_members m
    where m.organisation_id = org
      and m.user_id = auth.uid()
      and m.active = true
      and m.role in ('owner', 'admin', 'manager', 'finance')
  );
$$;

create or replace function public.can_manage_finance(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organisation_members m
    where m.organisation_id = org
      and m.user_id = auth.uid()
      and m.active = true
      and m.role in ('owner', 'admin', 'manager', 'finance')
  );
$$;

-- Baseline monthly economics for each family.
create table if not exists public.family_fee_plans (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  effective_from date not null,
  effective_to date,
  currency char(3) not null default 'GBP',
  monthly_revenue numeric(12,2) not null check (monthly_revenue >= 0),
  monthly_cost numeric(12,2) not null default 0 check (monthly_cost >= 0),
  monthly_profit numeric(12,2) generated always as (monthly_revenue - monthly_cost) stored,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_fee_plan_dates_check check (effective_to is null or effective_to >= effective_from),
  unique (organisation_id, family_id, effective_from)
);

-- Actual invoices. Keep planned fee profiles separate from real billing history.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete restrict,
  invoice_number text not null,
  period_start date not null,
  period_end date not null,
  issue_date date not null default current_date,
  due_date date,
  currency char(3) not null default 'GBP',
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'draft'
    check (status in ('draft','issued','part_paid','paid','overdue','cancelled')),
  uc_claim_id uuid references public.uc_claims(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_period_check check (period_end >= period_start),
  unique (organisation_id, invoice_number)
);

-- Payments may be linked to an invoice, while retaining the family link for reporting.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  paid_at timestamptz not null default now(),
  currency char(3) not null default 'GBP',
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  payment_reference text,
  status text not null default 'confirmed'
    check (status in ('pending','confirmed','failed','refunded')),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Centre-level expenses enable actual profit reporting later.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  expense_date date not null default current_date,
  category text not null,
  description text,
  currency char(3) not null default 'GBP',
  amount numeric(12,2) not null check (amount >= 0),
  supplier text,
  status text not null default 'confirmed'
    check (status in ('planned','confirmed','cancelled')),
  receipt_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fee_plans_org_family
  on public.family_fee_plans (organisation_id, family_id, active, effective_from desc);
create index if not exists idx_invoices_org_period
  on public.invoices (organisation_id, period_start, status);
create index if not exists idx_invoices_org_family
  on public.invoices (organisation_id, family_id);
create index if not exists idx_payments_org_paid
  on public.payments (organisation_id, paid_at, status);
create index if not exists idx_payments_invoice
  on public.payments (invoice_id);
create index if not exists idx_expenses_org_date
  on public.expenses (organisation_id, expense_date, category);

alter table public.family_fee_plans enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

-- Re-runnable policies.
drop policy if exists "finance users read fee plans" on public.family_fee_plans;
drop policy if exists "finance users write fee plans" on public.family_fee_plans;
drop policy if exists "finance users read invoices" on public.invoices;
drop policy if exists "finance users write invoices" on public.invoices;
drop policy if exists "finance users read payments" on public.payments;
drop policy if exists "finance users write payments" on public.payments;
drop policy if exists "finance users read expenses" on public.expenses;
drop policy if exists "finance users write expenses" on public.expenses;

create policy "finance users read fee plans"
  on public.family_fee_plans for select to authenticated
  using (public.can_view_finance(organisation_id));
create policy "finance users write fee plans"
  on public.family_fee_plans for all to authenticated
  using (public.can_manage_finance(organisation_id))
  with check (public.can_manage_finance(organisation_id));

create policy "finance users read invoices"
  on public.invoices for select to authenticated
  using (public.can_view_finance(organisation_id));
create policy "finance users write invoices"
  on public.invoices for all to authenticated
  using (public.can_manage_finance(organisation_id))
  with check (public.can_manage_finance(organisation_id));

create policy "finance users read payments"
  on public.payments for select to authenticated
  using (public.can_view_finance(organisation_id));
create policy "finance users write payments"
  on public.payments for all to authenticated
  using (public.can_manage_finance(organisation_id))
  with check (public.can_manage_finance(organisation_id));

create policy "finance users read expenses"
  on public.expenses for select to authenticated
  using (public.can_view_finance(organisation_id));
create policy "finance users write expenses"
  on public.expenses for all to authenticated
  using (public.can_manage_finance(organisation_id))
  with check (public.can_manage_finance(organisation_id));

grant select, insert, update, delete on public.family_fee_plans to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;

-- Latest active fee plan per family.
create or replace view public.current_family_fee_plans
with (security_invoker = true)
as
select distinct on (p.organisation_id, p.family_id)
  p.id,
  p.organisation_id,
  p.family_id,
  p.effective_from,
  p.effective_to,
  p.currency,
  p.monthly_revenue,
  p.monthly_cost,
  p.monthly_profit,
  p.active,
  p.notes
from public.family_fee_plans p
where p.active = true
  and p.effective_from <= current_date
  and (p.effective_to is null or p.effective_to >= current_date)
order by p.organisation_id, p.family_id, p.effective_from desc;

-- One row per family for the bar chart and responsive finance table.
create or replace view public.finance_family_summary
with (security_invoker = true)
as
select
  p.organisation_id,
  p.family_id,
  f.reference_code,
  f.parent_name,
  f.payment_type,
  p.currency,
  p.monthly_revenue,
  p.monthly_cost,
  p.monthly_profit,
  round(
    case when p.monthly_revenue = 0 then 0
         else (p.monthly_profit / p.monthly_revenue) * 100 end,
    1
  ) as profit_margin_percent,
  p.effective_from
from public.current_family_fee_plans p
join public.families f on f.id = p.family_id;

-- Invoice balances are calculated from confirmed payments.
create or replace view public.invoice_balances
with (security_invoker = true)
as
select
  i.id,
  i.organisation_id,
  i.family_id,
  i.invoice_number,
  i.period_start,
  i.period_end,
  i.issue_date,
  i.due_date,
  i.currency,
  i.amount,
  i.status,
  coalesce(sum(p.amount) filter (where p.status = 'confirmed'), 0)::numeric(12,2) as amount_paid,
  greatest(
    i.amount - coalesce(sum(p.amount) filter (where p.status = 'confirmed'), 0),
    0
  )::numeric(12,2) as balance_due
from public.invoices i
left join public.payments p on p.invoice_id = i.id
group by i.id;

-- One dashboard row per organisation: planned economics plus current actuals.
create or replace view public.finance_dashboard_overview
with (security_invoker = true)
as
with plan_totals as (
  select
    organisation_id,
    count(*)::integer as families_with_plan,
    coalesce(sum(monthly_revenue), 0)::numeric(12,2) as planned_revenue,
    coalesce(sum(monthly_cost), 0)::numeric(12,2) as planned_cost,
    coalesce(sum(monthly_profit), 0)::numeric(12,2) as planned_profit
  from public.current_family_fee_plans
  group by organisation_id
),
family_totals as (
  select organisation_id, count(*)::integer as active_families
  from public.families
  where status = 'active'
  group by organisation_id
),
actual_totals as (
  select
    organisation_id,
    coalesce(sum(amount), 0)::numeric(12,2) as invoiced_this_month,
    coalesce(sum(amount_paid), 0)::numeric(12,2) as received_this_month,
    coalesce(sum(balance_due), 0)::numeric(12,2) as outstanding_total
  from public.invoice_balances
  where date_trunc('month', period_start) = date_trunc('month', current_date)
    and status <> 'cancelled'
  group by organisation_id
),
expense_totals as (
  select
    organisation_id,
    coalesce(sum(amount), 0)::numeric(12,2) as actual_expenses_this_month
  from public.expenses
  where status = 'confirmed'
    and date_trunc('month', expense_date) = date_trunc('month', current_date)
  group by organisation_id
)
select
  o.id as organisation_id,
  coalesce(p.families_with_plan, 0) as families_with_plan,
  coalesce(f.active_families, 0) as active_families,
  coalesce(p.planned_revenue, 0)::numeric(12,2) as planned_revenue,
  coalesce(p.planned_cost, 0)::numeric(12,2) as planned_cost,
  coalesce(p.planned_profit, 0)::numeric(12,2) as planned_profit,
  round(
    case when coalesce(p.planned_revenue, 0) = 0 then 0
         else (p.planned_profit / p.planned_revenue) * 100 end,
    1
  ) as planned_profit_margin_percent,
  round(
    case when coalesce(p.planned_revenue, 0) = 0 then 0
         else (p.planned_cost / p.planned_revenue) * 100 end,
    1
  ) as planned_cost_ratio_percent,
  round(
    case when coalesce(f.active_families, 0) = 0 then 0
         else (coalesce(p.families_with_plan, 0)::numeric / f.active_families) * 100 end,
    1
  ) as fee_plan_coverage_percent,
  coalesce(a.invoiced_this_month, 0)::numeric(12,2) as invoiced_this_month,
  coalesce(a.received_this_month, 0)::numeric(12,2) as received_this_month,
  coalesce(a.outstanding_total, 0)::numeric(12,2) as outstanding_total,
  round(
    case when coalesce(a.invoiced_this_month, 0) = 0 then 0
         else (a.received_this_month / a.invoiced_this_month) * 100 end,
    1
  ) as collection_rate_percent,
  coalesce(e.actual_expenses_this_month, 0)::numeric(12,2) as actual_expenses_this_month,
  (
    coalesce(a.received_this_month, 0) - coalesce(e.actual_expenses_this_month, 0)
  )::numeric(12,2) as actual_profit_this_month
from public.organisations o
left join plan_totals p on p.organisation_id = o.id
left join family_totals f on f.organisation_id = o.id
left join actual_totals a on a.organisation_id = o.id
left join expense_totals e on e.organisation_id = o.id;

-- Historical line chart. It remains empty until real invoices/payments are entered.
create or replace view public.finance_monthly_trend
with (security_invoker = true)
as
select
  organisation_id,
  date_trunc('month', period_start)::date as month,
  coalesce(sum(amount), 0)::numeric(12,2) as invoiced,
  coalesce(sum(amount_paid), 0)::numeric(12,2) as received,
  coalesce(sum(balance_due), 0)::numeric(12,2) as outstanding
from public.invoice_balances
where status <> 'cancelled'
group by organisation_id, date_trunc('month', period_start)::date;

grant select on public.current_family_fee_plans to authenticated;
grant select on public.finance_family_summary to authenticated;
grant select on public.invoice_balances to authenticated;
grant select on public.finance_dashboard_overview to authenticated;
grant select on public.finance_monthly_trend to authenticated;

-- Seed the supplied monthly baseline figures.
-- Supplied values are interpreted as revenue and profit; allocated cost = revenue - profit.
with supplied(parent_name, monthly_revenue, monthly_profit) as (
  values
    ('Abda Elbushra',       1250.00::numeric,  600.00::numeric),
    ('Afrah Ibrahim',       2100.00::numeric,  980.00::numeric),
    ('Ahmed Abdulrahman',   2100.00::numeric,  980.00::numeric),
    ('Akhtar Hussain',      2160.00::numeric, 1000.00::numeric),
    ('Angelina Fosu',        936.00::numeric,  730.00::numeric),
    ('Aysha Iqbal',          408.00::numeric,  408.00::numeric),
    ('Eman Muhammed',       2100.00::numeric,  980.00::numeric),
    ('Gehan Sedahmed',      2100.00::numeric,  830.00::numeric),
    ('Jamaad Mohamoud',     1600.00::numeric,  700.00::numeric),
    ('Marafee Omar',        2100.00::numeric,  800.00::numeric),
    ('Motasim Abbas',       2100.00::numeric,  980.00::numeric),
    ('Nadeem Ahmed',         560.00::numeric,  560.00::numeric),
    ('Sahana Begum',         700.00::numeric,  700.00::numeric),
    ('Salma Ishak',          936.00::numeric,  500.00::numeric),
    ('Tracy Pater',          700.00::numeric,  700.00::numeric)
),
resolved as (
  select
    f.organisation_id,
    f.id as family_id,
    s.monthly_revenue,
    (s.monthly_revenue - s.monthly_profit)::numeric(12,2) as monthly_cost
  from supplied s
  join public.families f
    on lower(f.parent_name) = lower(s.parent_name)
   and f.organisation_id = '00000000-0000-0000-0000-000000000001'
)
insert into public.family_fee_plans (
  organisation_id,
  family_id,
  effective_from,
  currency,
  monthly_revenue,
  monthly_cost,
  active,
  notes
)
select
  organisation_id,
  family_id,
  date '2026-07-01',
  'GBP',
  monthly_revenue,
  monthly_cost,
  true,
  'Initial monthly finance baseline supplied for Nova analytics'
from resolved
on conflict (organisation_id, family_id, effective_from)
do update set
  monthly_revenue = excluded.monthly_revenue,
  monthly_cost = excluded.monthly_cost,
  active = true,
  notes = excluded.notes,
  updated_at = now();

commit;

-- Expected baseline after seeding:
-- Revenue: £21,850.00
-- Allocated cost: £10,402.00
-- Profit: £11,448.00
-- Profit margin: 52.4%
