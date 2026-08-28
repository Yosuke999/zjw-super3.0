-- Administrator audit closure. Run after 0004_admin_identity.sql.
-- Keeps security/business events append-only and makes owner-facing filters efficient.

alter table public.admin_audit_logs
  add column if not exists actor_id uuid,
  add column if not exists actor_email text not null default '',
  add column if not exists action text,
  add column if not exists target_type text not null default '',
  add column if not exists target_id text not null default '',
  add column if not exists outcome text not null default 'success',
  add column if not exists request_id text not null default '',
  add column if not exists ip_hash text not null default '',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_action_length') then
    alter table public.admin_audit_logs
      add constraint admin_audit_action_length check (length(action) between 3 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_outcome_valid') then
    alter table public.admin_audit_logs
      add constraint admin_audit_outcome_valid check (outcome in ('success', 'failure', 'denied')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_metadata_object') then
    alter table public.admin_audit_logs
      add constraint admin_audit_metadata_object check (jsonb_typeof(metadata) = 'object') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_ip_fingerprint_length') then
    alter table public.admin_audit_logs
      add constraint admin_audit_ip_fingerprint_length check (length(ip_hash) <= 100) not valid;
  end if;
end;
$$;

create index if not exists admin_audit_actor_created_idx
  on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists admin_audit_action_created_idx
  on public.admin_audit_logs (action, created_at desc);
create index if not exists admin_audit_outcome_created_idx
  on public.admin_audit_logs (outcome, created_at desc);

create or replace function public.prevent_admin_audit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'administrator audit logs are append-only';
end;
$$;

drop trigger if exists admin_audit_append_only on public.admin_audit_logs;
create trigger admin_audit_append_only
before update or delete on public.admin_audit_logs
for each row execute function public.prevent_admin_audit_mutation();

create or replace function public.admin_audit_health()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.admin_audit_logs'::regclass
      and tgname = 'admin_audit_append_only'
      and not tgisinternal
  );
$$;

alter table public.admin_audit_logs enable row level security;
revoke all on table public.admin_audit_logs from anon, authenticated;
revoke update, delete, truncate on table public.admin_audit_logs from service_role;
grant select, insert on table public.admin_audit_logs to service_role;
revoke execute on function public.prevent_admin_audit_mutation() from public, anon, authenticated;
revoke execute on function public.admin_audit_health() from public, anon, authenticated;
grant execute on function public.admin_audit_health() to service_role;

comment on column public.admin_audit_logs.request_id is 'Server-generated request correlation identifier.';
comment on column public.admin_audit_logs.ip_hash is 'Purpose-separated, irreversible IP fingerprint; never a full IP address.';
comment on column public.admin_audit_logs.outcome is 'Operation result: success, failure or denied.';
