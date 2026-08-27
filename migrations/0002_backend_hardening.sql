-- Backend hardening: idempotency, atomic rate limits, audit history,
-- business-timezone metrics, defensive constraints, and retention helpers.

alter table public.inquiries add column if not exists idempotency_key text;

create unique index if not exists inquiries_idempotency_idx on public.inquiries (idempotency_key);
create index if not exists inquiries_status_created_idx on public.inquiries (status, created_at desc);
create index if not exists events_name_created_idx on public.analytics_events (event_name, created_at desc);
create index if not exists events_visitor_name_created_idx on public.analytics_events (visitor_id, event_name, created_at desc);
create index if not exists request_limits_created_idx on public.request_limits (created_at);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inquiries_total_nonnegative') then
    alter table public.inquiries add constraint inquiries_total_nonnegative check (total_cny >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inquiries_items_array') then
    alter table public.inquiries add constraint inquiries_items_array check (jsonb_typeof(items_json) = 'array') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'analytics_device_type_valid') then
    alter table public.analytics_events add constraint analytics_device_type_valid check (device_type in ('desktop', 'mobile', 'unknown')) not valid;
  end if;
end
$$;

create table if not exists public.inquiry_status_history (
  id bigint generated always as identity primary key,
  inquiry_id text not null references public.inquiries(id) on delete cascade,
  from_status text not null check (from_status in ('new', 'contacted', 'quoting', 'won', 'invalid')),
  to_status text not null check (to_status in ('new', 'contacted', 'quoting', 'won', 'invalid')),
  changed_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_delivery_log (
  id bigint generated always as identity primary key,
  inquiry_id text not null references public.inquiries(id) on delete cascade,
  channel text not null check (channel in ('webhook', 'email')),
  status text not null check (status in ('delivered', 'failed')),
  attempts integer not null check (attempts between 1 and 10),
  error text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists inquiry_status_history_inquiry_idx on public.inquiry_status_history (inquiry_id, created_at desc);
create index if not exists notification_delivery_inquiry_idx on public.notification_delivery_log (inquiry_id, created_at desc);

alter table public.inquiry_status_history enable row level security;
alter table public.notification_delivery_log enable row level security;
revoke all on table public.inquiry_status_history from anon, authenticated;
revoke all on table public.notification_delivery_log from anon, authenticated;
grant select, insert on table public.inquiry_status_history to service_role;
grant select, insert, delete on table public.notification_delivery_log to service_role;
grant usage, select on all sequences in schema public to service_role;

create or replace function public.check_and_record_rate_limit(
  p_rate_key text,
  p_maximum integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  recent_count integer;
begin
  if p_rate_key = '' or p_maximum < 1 or p_window_seconds < 1 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_rate_key, 0));
  delete from public.request_limits where created_at < now() - interval '24 hours';

  select count(*) into recent_count
  from public.request_limits
  where rate_key = p_rate_key
    and created_at >= now() - make_interval(secs => p_window_seconds);

  if recent_count >= p_maximum then
    return false;
  end if;

  insert into public.request_limits (rate_key) values (p_rate_key);
  return true;
end;
$$;

create or replace function public.admin_update_inquiry_status(
  p_id text,
  p_status text,
  p_actor text
)
returns setof public.inquiries
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  previous_status text;
  updated_inquiry public.inquiries%rowtype;
begin
  if p_status not in ('new', 'contacted', 'quoting', 'won', 'invalid') then
    raise exception 'invalid inquiry status';
  end if;

  select status into previous_status
  from public.inquiries
  where id = p_id
  for update;

  if not found then
    return;
  end if;

  if previous_status = p_status then
    select * into updated_inquiry from public.inquiries where id = p_id;
    return next updated_inquiry;
    return;
  end if;

  update public.inquiries
  set status = p_status, updated_at = now()
  where id = p_id
  returning * into updated_inquiry;

  insert into public.inquiry_status_history (inquiry_id, from_status, to_status, changed_by)
  values (p_id, previous_status, p_status, left(coalesce(nullif(p_actor, ''), 'unknown'), 100));

  return next updated_inquiry;
end;
$$;

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
    (
      select count(distinct i.visitor_id)
      from public.inquiries i
      where i.created_at >= p_since
        and i.visitor_id <> ''
        and exists (
          select 1 from public.analytics_events e
          where e.event_name = 'page_view'
            and e.created_at >= p_since
            and e.visitor_id = i.visitor_id
        )
    ),
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
    select (created_at at time zone 'Asia/Shanghai')::date as date,
      count(*) as page_views,
      count(distinct nullif(visitor_id, '')) as visitors
    from public.analytics_events
    where event_name = 'page_view' and created_at >= p_since
    group by (created_at at time zone 'Asia/Shanghai')::date
  ), inquiry_days as (
    select (created_at at time zone 'Asia/Shanghai')::date as date, count(*) as inquiries
    from public.inquiries
    where created_at >= p_since
    group by (created_at at time zone 'Asia/Shanghai')::date
  )
  select coalesce(event_days.date, inquiry_days.date),
    coalesce(event_days.page_views, 0),
    coalesce(event_days.visitors, 0),
    coalesce(inquiry_days.inquiries, 0)
  from event_days full join inquiry_days using (date)
  order by 1;
$$;

create or replace function public.cleanup_backend_data(
  p_analytics_days integer default 400,
  p_rate_limit_hours integer default 24
)
returns table (deleted_analytics bigint, deleted_rate_limits bigint, deleted_notification_logs bigint)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  analytics_count bigint;
  limits_count bigint;
  notifications_count bigint;
begin
  delete from public.analytics_events
  where created_at < now() - make_interval(days => greatest(p_analytics_days, 30));
  get diagnostics analytics_count = row_count;

  delete from public.request_limits
  where created_at < now() - make_interval(hours => greatest(p_rate_limit_hours, 1));
  get diagnostics limits_count = row_count;

  delete from public.notification_delivery_log
  where created_at < now() - interval '180 days';
  get diagnostics notifications_count = row_count;

  return query select analytics_count, limits_count, notifications_count;
end;
$$;

revoke execute on function public.check_and_record_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.admin_update_inquiry_status(text, text, text) from public, anon, authenticated;
revoke execute on function public.cleanup_backend_data(integer, integer) from public, anon, authenticated;
grant execute on function public.check_and_record_rate_limit(text, integer, integer) to service_role;
grant execute on function public.admin_update_inquiry_status(text, text, text) to service_role;
grant execute on function public.cleanup_backend_data(integer, integer) to service_role;

comment on column public.inquiries.idempotency_key is 'Unique request key used to prevent duplicate inquiries after client retries.';
comment on table public.inquiry_status_history is 'Immutable audit history for administrator inquiry status changes.';
comment on table public.notification_delivery_log is 'Delivery result log for inquiry email and webhook notifications.';
