-- Tenant portal schema for Supabase project bgjkjtfgrfiszbzatriq.
-- Apply this in the SQL editor only when profiles, units, leases, and
-- maintenance_requests are not already present. Existing tables should be
-- left as they are.
--
-- After this script, create an Auth user (Authentication → Users) with
-- email tenant@example.com, then run supabase/seed.sql.

do $$
begin
  if to_regclass('public.profiles') is not null
    or to_regclass('public.units') is not null
    or to_regclass('public.leases') is not null
    or to_regclass('public.maintenance_requests') is not null
  then
    raise exception
      'Tenant tables already exist. Inspect that schema instead of applying this script.';
  end if;
end $$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now(),
  constraint profiles_full_name_len check (char_length(btrim(full_name)) between 1 and 120),
  constraint profiles_phone_len check (phone is null or char_length(phone) <= 40)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_name text not null,
  address_line text not null,
  city text not null,
  unit_number text not null,
  bedrooms integer,
  bathrooms numeric(3, 1),
  created_at timestamptz not null default now(),
  constraint units_property_name_len check (char_length(btrim(property_name)) between 1 and 120),
  constraint units_address_len check (char_length(btrim(address_line)) between 1 and 160),
  constraint units_city_len check (char_length(btrim(city)) between 1 and 80),
  constraint units_number_len check (char_length(btrim(unit_number)) between 1 and 20),
  constraint units_bedrooms_nonnegative check (bedrooms is null or bedrooms >= 0),
  constraint units_bathrooms_nonnegative check (bathrooms is null or bathrooms >= 0)
);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  unit_id uuid not null references public.units (id),
  rent_amount numeric(10, 2) not null,
  due_day integer not null,
  start_date date not null,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint leases_rent_positive check (rent_amount > 0),
  constraint leases_due_day_range check (due_day between 1 and 28),
  constraint leases_status_known check (status in ('active', 'ended')),
  constraint leases_end_after_start check (end_date is null or end_date >= start_date)
);

create unique index leases_one_active_per_tenant
  on public.leases (tenant_id)
  where status = 'active';

create index leases_unit_id_idx on public.leases (unit_id);

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles (id) on delete cascade,
  unit_id uuid not null references public.units (id),
  category text not null,
  location text,
  description text not null,
  urgency text not null default 'normal',
  permission_to_enter boolean not null default false,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  constraint maintenance_category_known check (
    category in ('plumbing', 'electrical', 'hvac', 'appliance', 'pest', 'other')
  ),
  constraint maintenance_urgency_known check (urgency in ('low', 'normal', 'urgent')),
  constraint maintenance_status_known check (
    status in ('submitted', 'in_progress', 'completed', 'cancelled')
  ),
  constraint maintenance_description_len check (
    char_length(btrim(description)) between 1 and 2000
    and description = btrim(description)
  ),
  constraint maintenance_location_len check (
    location is null
    or (
      char_length(btrim(location)) between 1 and 80
      and location = btrim(location)
    )
  )
);

create index maintenance_requests_tenant_created_idx
  on public.maintenance_requests (tenant_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.units enable row level security;
alter table public.leases enable row level security;
alter table public.maintenance_requests enable row level security;

alter table public.profiles force row level security;
alter table public.units force row level security;
alter table public.leases force row level security;
alter table public.maintenance_requests force row level security;

-- (select auth.uid()) is evaluated once per query, not once per row.
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy leases_select_own
  on public.leases
  for select
  to authenticated
  using (tenant_id = (select auth.uid()));

create policy units_select_own_lease
  on public.units
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.leases as lease
      where lease.unit_id = units.id
        and lease.tenant_id = (select auth.uid())
    )
  );

create policy maintenance_requests_select_own
  on public.maintenance_requests
  for select
  to authenticated
  using (tenant_id = (select auth.uid()));

create policy maintenance_requests_insert_own
  on public.maintenance_requests
  for insert
  to authenticated
  with check (
    tenant_id = (select auth.uid())
    and status = 'submitted'
    and exists (
      select 1
      from public.leases as lease
      where lease.unit_id = maintenance_requests.unit_id
        and lease.tenant_id = (select auth.uid())
        and lease.status = 'active'
    )
  );

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.units from public, anon, authenticated;
revoke all on table public.leases from public, anon, authenticated;
revoke all on table public.maintenance_requests from public, anon, authenticated;

grant select on table public.profiles, public.units, public.leases to authenticated;
grant select, insert on table public.maintenance_requests to authenticated;
