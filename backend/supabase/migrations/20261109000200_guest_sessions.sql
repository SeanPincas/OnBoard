-- OnBoard Phase 4 guest session foundation

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token_hash text not null unique,
  active_role public.app_role not null default 'tenant',
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  reset_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles
  alter column clerk_user_id drop not null,
  add column guest_session_id uuid references public.guest_sessions(id) on delete cascade;

alter table public.profiles
  add constraint profiles_identity_source_check
  check ((clerk_user_id is not null) <> (guest_session_id is not null));

create unique index guest_profiles_role_unique
  on public.profiles (guest_session_id, role)
  where guest_session_id is not null;

create index guest_sessions_expiry_idx on public.guest_sessions (expires_at);
create index profiles_guest_session_idx on public.profiles (guest_session_id);

alter table public.guest_sessions enable row level security;

-- Guest sessions are accessed only through server-side session services using
-- the Supabase secret key. No browser role receives a direct policy here.
