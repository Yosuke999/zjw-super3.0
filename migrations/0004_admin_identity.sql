-- Production administrator identity: Supabase Auth profiles, revocable sessions,
-- role-based access control metadata and an append-only audit trail.

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  email text not null unique,
  display_name text not null default '',
  role text not null default 'viewer' check (role in ('owner', 'manager', 'operator', 'viewer')),
  active boolean not null default true,
  mfa_required boolean not null default true,
  session_version integer not null default 1 check (session_version > 0),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(email) and length(email) between 3 and 320)
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_profiles(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  session_version integer not null check (session_version > 0),
  ip_hash text not null default '',
  user_agent_hash text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text not null default '',
  check (expires_at > created_at)
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text not null default '',
  action text not null check (length(action) between 3 and 100),
  target_type text not null default '',
  target_id text not null default '',
  outcome text not null default 'success' check (outcome in ('success', 'failure', 'denied')),
  request_id text not null default '',
  ip_hash text not null default '',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists admin_profiles_role_active_idx on public.admin_profiles (role, active);
create index if not exists admin_sessions_user_active_idx on public.admin_sessions (user_id, expires_at desc) where revoked_at is null;
create index if not exists admin_sessions_expiry_idx on public.admin_sessions (expires_at);
create index if not exists admin_audit_created_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_actor_created_idx on public.admin_audit_logs (actor_id, created_at desc);
create index if not exists admin_audit_action_created_idx on public.admin_audit_logs (action, created_at desc);

create or replace function public.touch_admin_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_profiles_touch_updated_at on public.admin_profiles;
create trigger admin_profiles_touch_updated_at
before update on public.admin_profiles
for each row execute function public.touch_admin_profile_updated_at();

create or replace function public.protect_last_admin_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.role = 'owner' and old.active then
    -- Serialize owner-removal checks so two concurrent updates cannot both
    -- observe the other owner and leave the system without an active owner.
    perform pg_advisory_xact_lock(hashtext('admin_profiles_active_owner'));
    if tg_op = 'DELETE' then
      if not exists (select 1 from public.admin_profiles where id <> old.id and role = 'owner' and active) then
        raise exception 'at least one active administrator owner is required';
      end if;
    elsif (new.role <> 'owner' or not new.active)
      and not exists (select 1 from public.admin_profiles where id <> old.id and role = 'owner' and active) then
      raise exception 'at least one active administrator owner is required';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.cleanup_admin_sessions(p_retention_days integer default 30)
returns bigint
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  deleted_count bigint;
begin
  delete from public.admin_sessions
  where expires_at < now() - make_interval(days => greatest(p_retention_days, 1))
     or (revoked_at is not null and revoked_at < now() - make_interval(days => greatest(p_retention_days, 1)));
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

drop trigger if exists admin_profiles_protect_last_owner on public.admin_profiles;
create trigger admin_profiles_protect_last_owner
before update or delete on public.admin_profiles
for each row execute function public.protect_last_admin_owner();

create or replace function public.admin_resolve_session(p_token_hash text)
returns table (
  session_id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  mfa_required boolean,
  expires_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = public
as $$
begin
  update public.admin_sessions s
  set last_seen_at = now()
  where s.token_hash = p_token_hash
    and s.last_seen_at < now() - interval '5 minutes'
    and s.revoked_at is null
    and s.expires_at > now();

  return query
  select s.id, p.id, p.email, p.display_name, p.role, p.mfa_required, s.expires_at
  from public.admin_sessions s
  join public.admin_profiles p on p.id = s.user_id
  where s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.expires_at > now()
    and p.active
    and s.session_version = p.session_version
  limit 1;
end;
$$;

alter table public.admin_profiles enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on table public.admin_profiles from anon, authenticated;
revoke all on table public.admin_sessions from anon, authenticated;
revoke all on table public.admin_audit_logs from anon, authenticated;
grant select, insert, update on table public.admin_profiles to service_role;
grant select, insert, update, delete on table public.admin_sessions to service_role;
grant select, insert on table public.admin_audit_logs to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke execute on function public.admin_resolve_session(text) from public, anon, authenticated;
revoke execute on function public.cleanup_admin_sessions(integer) from public, anon, authenticated;
grant execute on function public.admin_resolve_session(text) to service_role;
grant execute on function public.cleanup_admin_sessions(integer) to service_role;

comment on table public.admin_profiles is 'Administrator authorization profiles linked to Supabase Auth users.';
comment on table public.admin_sessions is 'Opaque, server-resolved administrator sessions that support immediate revocation.';
comment on table public.admin_audit_logs is 'Append-only administrator security and business-operation audit trail.';
