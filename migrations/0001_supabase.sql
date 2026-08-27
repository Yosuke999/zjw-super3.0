-- Run this file once in Supabase Dashboard > SQL Editor.
-- All application access uses the server-only service_role key.

create table if not exists public.inquiries (
  id text primary key,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoting', 'won', 'invalid')),
  destination text not null default '',
  phone text not null,
  whatsapp text not null default '',
  email text not null default '',
  preferred_contact text not null default 'phone' check (preferred_contact in ('phone', 'whatsapp', 'email')),
  note text not null default '',
  language text not null default '',
  currency text not null default '',
  market text not null default '',
  source_path text not null default '/',
  source text not null default '直接访问',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  visitor_id text not null default '',
  session_id text not null default '',
  items_json jsonb not null default '[]'::jsonb,
  total_cny numeric(16, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id text primary key,
  event_name text not null check (event_name in ('page_view', 'inquiry_submitted')),
  visitor_id text not null default '',
  session_id text not null default '',
  path text not null default '/',
  source text not null default '直接访问',
  referrer text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  language text not null default '',
  device_type text not null default 'desktop',
  created_at timestamptz not null default now()
);

create table if not exists public.request_limits (
  id bigint generated always as identity primary key,
  rate_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_visitor_idx on public.inquiries (visitor_id);
create index if not exists events_created_idx on public.analytics_events (created_at desc);
create index if not exists events_name_idx on public.analytics_events (event_name);
create index if not exists events_visitor_idx on public.analytics_events (visitor_id);
create index if not exists limits_key_idx on public.request_limits (rate_key, created_at desc);

alter table public.inquiries enable row level security;
alter table public.analytics_events enable row level security;
alter table public.request_limits enable row level security;

revoke all on table public.inquiries from anon, authenticated;
revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.request_limits from anon, authenticated;
grant all on table public.inquiries to service_role;
grant all on table public.analytics_events to service_role;
grant all on table public.request_limits to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.admin_metrics(p_since timestamptz)
returns table (
  page_views bigint,
  visitors bigint,
  sessions bigint,
  inquiries bigint,
  inquiry_visitors bigint,
  valid_inquiries bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.analytics_events where event_name = 'page_view' and created_at >= p_since),
    (select count(distinct nullif(visitor_id, '')) from public.analytics_events where event_name = 'page_view' and created_at >= p_since),
    (select count(distinct nullif(session_id, '')) from public.analytics_events where event_name = 'page_view' and created_at >= p_since),
    (select count(*) from public.inquiries where created_at >= p_since),
    (select count(distinct nullif(visitor_id, '')) from public.inquiries where created_at >= p_since),
    (select count(*) from public.inquiries where status <> 'invalid' and created_at >= p_since);
$$;

create or replace function public.admin_trend(p_since timestamptz)
returns table (date date, page_views bigint, visitors bigint, inquiries bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with event_days as (
    select created_at::date as date, count(*) as page_views, count(distinct nullif(visitor_id, '')) as visitors
    from public.analytics_events
    where event_name = 'page_view' and created_at >= p_since
    group by created_at::date
  ), inquiry_days as (
    select created_at::date as date, count(*) as inquiries
    from public.inquiries
    where created_at >= p_since
    group by created_at::date
  )
  select coalesce(event_days.date, inquiry_days.date), coalesce(event_days.page_views, 0), coalesce(event_days.visitors, 0), coalesce(inquiry_days.inquiries, 0)
  from event_days full join inquiry_days using (date)
  order by 1;
$$;

create or replace function public.admin_rank_sources(p_since timestamptz)
returns table (label text, page_views bigint, inquiries bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with combined as (
    select source as label, count(*) as page_views, 0::bigint as inquiries
    from public.analytics_events where event_name = 'page_view' and created_at >= p_since group by source
    union all
    select source as label, 0::bigint, count(*)
    from public.inquiries where created_at >= p_since group by source
  )
  select label, sum(page_views)::bigint, sum(inquiries)::bigint
  from combined group by label order by sum(page_views) + sum(inquiries) desc limit 6;
$$;

create or replace function public.admin_rank_pages(p_since timestamptz)
returns table (label text, page_views bigint, inquiries bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with combined as (
    select path as label, count(*) as page_views, 0::bigint as inquiries
    from public.analytics_events where event_name = 'page_view' and created_at >= p_since group by path
    union all
    select source_path as label, 0::bigint, count(*)
    from public.inquiries where created_at >= p_since group by source_path
  )
  select label, sum(page_views)::bigint, sum(inquiries)::bigint
  from combined group by label order by sum(page_views) + sum(inquiries) desc limit 6;
$$;

revoke execute on function public.admin_metrics(timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_trend(timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_rank_sources(timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_rank_pages(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_metrics(timestamptz) to service_role;
grant execute on function public.admin_trend(timestamptz) to service_role;
grant execute on function public.admin_rank_sources(timestamptz) to service_role;
grant execute on function public.admin_rank_pages(timestamptz) to service_role;

comment on table public.inquiries is 'Customer quotation requests submitted from the public website.';
comment on table public.analytics_events is 'First-party page view and inquiry conversion events; full IP addresses are not stored.';
