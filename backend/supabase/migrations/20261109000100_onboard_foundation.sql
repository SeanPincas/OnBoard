-- OnBoard Phase 2 foundation
-- Registered-user identity is supplied by Clerk through auth.jwt()->>'sub'.
-- Guest sessions are handled by server-only services and are not exposed here.

create extension if not exists postgis with schema extensions;

create type public.app_role as enum ('tenant', 'landlord');
create type public.city_name as enum ('manila_city', 'cebu_city');
create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.room_type as enum ('private', 'shared');
create type public.rental_basis as enum ('per_room', 'per_person', 'per_bed_space');
create type public.reservation_status as enum ('pending', 'confirmed', 'declined', 'cancelled');
create type public.allocation_status as enum ('reserved', 'occupied', 'released');
create type public.conversation_status as enum ('open', 'closed');

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt()->>'sub', '');
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  role public.app_role not null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  profile_photo_url text,
  contact_phone text,
  permanent_address text,
  age smallint check (age is null or age between 16 and 120),
  gender text check (gender is null or char_length(trim(gender)) between 1 and 80),
  student_or_employment_status text,
  onboarding_progress jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  landlord_profile_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text,
  city public.city_name not null,
  address text not null check (char_length(trim(address)) between 5 and 300),
  landmark text,
  location extensions.geography(Point, 4326) not null,
  amenities jsonb not null default '[]'::jsonb,
  house_rules jsonb not null default '{}'::jsonb,
  occupancy_restriction text not null default 'any_gender',
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (occupancy_restriction in ('any_gender', 'female_only', 'male_only'))
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  room_number text,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  room_type public.room_type not null,
  rental_basis public.rental_basis not null,
  monthly_rent numeric(12, 2) not null check (monthly_rent >= 0),
  security_deposit numeric(12, 2) not null default 0 check (security_deposit >= 0),
  advance_payment numeric(12, 2) not null default 0 check (advance_payment >= 0),
  utility_fee numeric(12, 2) not null default 0 check (utility_fee >= 0),
  capacity smallint not null check (capacity between 1 and 100),
  furnished boolean not null default false,
  bathroom_type text not null default 'shared',
  available_from date,
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((room_type = 'shared' and rental_basis in ('per_person', 'per_bed_space')) or
         (room_type = 'private' and rental_basis = 'per_room'))
);

create table public.bed_spaces (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete restrict,
  label text not null check (char_length(trim(label)) between 1 and 60),
  monthly_rent numeric(12, 2) not null check (monthly_rent >= 0),
  publication_status public.publication_status not null default 'published',
  created_at timestamptz not null default now(),
  unique (room_id, label)
);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  check ((property_id is not null) <> (room_id is not null))
);

create table public.reservation_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_profile_id uuid not null references public.profiles(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  bed_space_id uuid references public.bed_spaces(id) on delete restrict,
  requested_occupants smallint not null default 1 check (requested_occupants between 1 and 100),
  intended_move_in date not null,
  agreed_monthly_rent numeric(12, 2),
  message text,
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bed_space_id is null or requested_occupants = 1)
);

create table public.inventory_allocations (
  id uuid primary key default gen_random_uuid(),
  reservation_request_id uuid not null references public.reservation_requests(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  bed_space_id uuid references public.bed_spaces(id) on delete restrict,
  occupant_count smallint not null default 1 check (occupant_count between 1 and 100),
  status public.allocation_status not null,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on),
  check (bed_space_id is null or occupant_count = 1)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  room_id uuid references public.rooms(id) on delete restrict,
  status public.conversation_status not null default 'open',
  created_at timestamptz not null default now(),
  check (room_id is null or property_id is not null)
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index properties_location_gix on public.properties using gist (location);
create index properties_publication_city_idx on public.properties (publication_status, city);
create index properties_landlord_idx on public.properties (landlord_profile_id);
create index rooms_property_publication_idx on public.rooms (property_id, publication_status);
create index bed_spaces_room_publication_idx on public.bed_spaces (room_id, publication_status);
create index reservations_tenant_status_idx on public.reservation_requests (tenant_profile_id, status);
create index reservations_room_status_idx on public.reservation_requests (room_id, status);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

create unique index active_room_allocations_unique
  on public.inventory_allocations (room_id)
  where bed_space_id is null and status in ('reserved', 'occupied');

create unique index active_bed_allocations_unique
  on public.inventory_allocations (bed_space_id)
  where bed_space_id is not null and status in ('reserved', 'occupied');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms
for each row execute function public.set_updated_at();
create trigger reservations_set_updated_at before update on public.reservation_requests
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.rooms enable row level security;
alter table public.bed_spaces enable row level security;
alter table public.listing_photos enable row level security;
alter table public.reservation_requests enable row level security;
alter table public.inventory_allocations enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy profiles_select_self on public.profiles
for select to authenticated
using (clerk_user_id = public.current_clerk_user_id());

create policy profiles_insert_self on public.profiles
for insert to authenticated
with check (clerk_user_id = public.current_clerk_user_id());

create policy profiles_update_self on public.profiles
for update to authenticated
using (clerk_user_id = public.current_clerk_user_id())
with check (clerk_user_id = public.current_clerk_user_id());

create policy properties_public_select on public.properties
for select to anon, authenticated
using (publication_status = 'published');

create policy properties_owner_select on public.properties
for select to authenticated
using (landlord_profile_id in (
  select id from public.profiles where clerk_user_id = public.current_clerk_user_id()
));

create policy properties_owner_insert on public.properties
for insert to authenticated
with check (landlord_profile_id in (
  select id from public.profiles
  where clerk_user_id = public.current_clerk_user_id() and role = 'landlord'
));

create policy properties_owner_update on public.properties
for update to authenticated
using (landlord_profile_id in (
  select id from public.profiles where clerk_user_id = public.current_clerk_user_id()
))
with check (landlord_profile_id in (
  select id from public.profiles
  where clerk_user_id = public.current_clerk_user_id() and role = 'landlord'
));

create policy rooms_public_select on public.rooms
for select to anon, authenticated
using (publication_status = 'published' and exists (
  select 1 from public.properties p
  where p.id = property_id and p.publication_status = 'published'
));

create policy rooms_owner_all on public.rooms
for all to authenticated
using (exists (
  select 1 from public.properties p
  join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
  where p.id = property_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
))
with check (exists (
  select 1 from public.properties p
  join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
  where p.id = property_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
));

create policy bed_spaces_public_select on public.bed_spaces
for select to anon, authenticated
using (publication_status = 'published' and exists (
  select 1 from public.rooms r
  join public.properties p on p.id = r.property_id
  where r.id = room_id and r.publication_status = 'published' and p.publication_status = 'published'
));

create policy bed_spaces_owner_all on public.bed_spaces
for all to authenticated
using (exists (
  select 1 from public.rooms r
  join public.properties p on p.id = r.property_id
  join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
  where r.id = room_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
))
with check (exists (
  select 1 from public.rooms r
  join public.properties p on p.id = r.property_id
  join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
  where r.id = room_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
));

create policy listing_photos_public_select on public.listing_photos
for select to anon, authenticated
using (
  (property_id is not null and exists (select 1 from public.properties p where p.id = property_id and p.publication_status = 'published'))
  or (room_id is not null and exists (
    select 1 from public.rooms r join public.properties p on p.id = r.property_id
    where r.id = room_id and r.publication_status = 'published' and p.publication_status = 'published'
  ))
);

create policy listing_photos_owner_all on public.listing_photos
for all to authenticated
using (
  (property_id is not null and exists (
    select 1 from public.properties p
    join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
    where p.id = property_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
  ))
  or (room_id is not null and exists (
    select 1 from public.rooms r
    join public.properties p on p.id = r.property_id
    join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
    where r.id = room_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
  ))
)
with check (
  (property_id is not null and exists (
    select 1 from public.properties p
    join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
    where p.id = property_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
  ))
  or (room_id is not null and exists (
    select 1 from public.rooms r
    join public.properties p on p.id = r.property_id
    join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
    where r.id = room_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
  ))
);

create policy reservations_tenant_select on public.reservation_requests
for select to authenticated
using (tenant_profile_id in (
  select id from public.profiles where clerk_user_id = public.current_clerk_user_id()
));

create policy reservations_tenant_insert on public.reservation_requests
for insert to authenticated
with check (tenant_profile_id in (
  select id from public.profiles where clerk_user_id = public.current_clerk_user_id() and role = 'tenant'
));

create policy reservations_landlord_select on public.reservation_requests
for select to authenticated
using (exists (
  select 1 from public.properties p
  join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
  where p.id = property_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
));

create policy reservations_landlord_update on public.reservation_requests
for update to authenticated
using (exists (
  select 1 from public.properties p
  join public.profiles owner_profile on owner_profile.id = p.landlord_profile_id
  where p.id = property_id and owner_profile.clerk_user_id = public.current_clerk_user_id()
));

create policy conversations_participant_select on public.conversations
for select to authenticated
using (exists (
  select 1 from public.conversation_participants cp
  join public.profiles participant on participant.id = cp.profile_id
  where cp.conversation_id = id and participant.clerk_user_id = public.current_clerk_user_id()
));

create policy conversation_participants_self_select on public.conversation_participants
for select to authenticated
using (profile_id in (
  select id from public.profiles where clerk_user_id = public.current_clerk_user_id()
));

create policy messages_participant_select on public.messages
for select to authenticated
using (exists (
  select 1 from public.conversation_participants cp
  join public.profiles participant on participant.id = cp.profile_id
  where cp.conversation_id = messages.conversation_id
    and participant.clerk_user_id = public.current_clerk_user_id()
));

create policy messages_participant_insert on public.messages
for insert to authenticated
with check (
  sender_profile_id in (select id from public.profiles where clerk_user_id = public.current_clerk_user_id())
  and exists (
    select 1 from public.conversation_participants cp
    join public.profiles participant on participant.id = cp.profile_id
    where cp.conversation_id = messages.conversation_id
      and participant.clerk_user_id = public.current_clerk_user_id()
  )
);
