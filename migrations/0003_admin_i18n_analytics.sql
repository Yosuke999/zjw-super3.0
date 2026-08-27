-- Admin internationalization support and privacy-safe behavioral analytics.

alter table public.analytics_events
  add column if not exists currency text not null default '',
  add column if not exists market text not null default '',
  add column if not exists properties jsonb not null default '{}'::jsonb;

alter table public.analytics_events drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events add constraint analytics_events_event_name_check check (event_name in (
  'page_view',
  'product_view',
  'product_card_click',
  'search_performed',
  'category_selected',
  'market_changed',
  'inquiry_item_added',
  'inquiry_opened',
  'inquiry_started',
  'inquiry_validation_error',
  'inquiry_submitted',
  'contact_clicked',
  'language_changed',
  'currency_changed',
  'page_engagement',
  'page_error',
  'web_vital'
)) not valid;

alter table public.analytics_events drop constraint if exists analytics_properties_object;
alter table public.analytics_events add constraint analytics_properties_object
  check (jsonb_typeof(properties) = 'object') not valid;

create index if not exists events_language_created_idx on public.analytics_events (language, created_at desc);
create index if not exists events_currency_created_idx on public.analytics_events (currency, created_at desc);
create index if not exists events_device_created_idx on public.analytics_events (device_type, created_at desc);
create index if not exists events_market_created_idx on public.analytics_events (market, created_at desc);

create or replace function public.admin_tracking_health(p_since timestamptz)
returns table (
  event_count bigint,
  page_views bigint,
  identified_views bigint,
  last_event_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    count(*) filter (where event_name = 'page_view'),
    count(*) filter (where event_name = 'page_view' and visitor_id <> ''),
    max(created_at)
  from public.analytics_events
  where created_at >= p_since;
$$;

create or replace function public.admin_event_funnel(p_since timestamptz)
returns table (event_name text, event_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select analytics_events.event_name, count(*)
  from public.analytics_events
  where created_at >= p_since
    and analytics_events.event_name in (
      'page_view', 'product_view', 'product_card_click', 'inquiry_item_added', 'inquiry_opened',
      'inquiry_started', 'inquiry_validation_error', 'inquiry_submitted', 'contact_clicked'
    )
  group by analytics_events.event_name;
$$;

revoke execute on function public.admin_tracking_health(timestamptz) from public, anon, authenticated;
revoke execute on function public.admin_event_funnel(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_tracking_health(timestamptz) to service_role;
grant execute on function public.admin_event_funnel(timestamptz) to service_role;

comment on column public.analytics_events.currency is 'Display currency active for the anonymous event.';
comment on column public.analytics_events.market is 'Selected target market, when applicable.';
comment on column public.analytics_events.properties is 'Whitelisted non-PII behavioral properties; contact fields and free-form notes are prohibited.';
