-- Roles for project bgjkjtfgrfiszbzatriq.
-- Auth still has one Postgres role, "authenticated". Admin, landlord, tenant,
-- and maintenance are application roles stored in public.user_roles.
--
-- Landlords, Tenants, and Staff already exist and already carry the ownership
-- links (Properties.landlord_id, MaintenanceRequests.assigned_staff_id).
-- A new Auth user whose email matches exactly one of those tables is linked
-- automatically. Create the admin in Authentication → Users, then run:
--
--   select private.assign_admin('admin@example.com');
--
-- After this migration, enable the hook in Authentication → Hooks:
--   custom_access_token_hook

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to postgres, authenticated, supabase_auth_admin;

do $$
begin
  if to_regclass('public."Landlords"') is null
    or to_regclass('public."Properties"') is null
    or to_regclass('public."Units"') is null
    or to_regclass('public."Tenants"') is null
    or to_regclass('public."Staff"') is null
    or to_regclass('public."MaintenanceRequests"') is null
  then
    raise exception 'Property tables are missing. Apply the existing schema before roles.';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role' and typnamespace = 'public'::regnamespace) then
    create type public.app_role as enum ('admin', 'landlord', 'tenant', 'maintenance');
  end if;
end $$;

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  landlord_id bigint references public."Landlords" (id) on delete cascade,
  tenant_id bigint references public."Tenants" (id) on delete cascade,
  staff_id bigint references public."Staff" (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_roles_subject_matches_role check (
    (
      role = 'admin'
      and landlord_id is null
      and tenant_id is null
      and staff_id is null
    )
    or (
      role = 'landlord'
      and landlord_id is not null
      and tenant_id is null
      and staff_id is null
    )
    or (
      role = 'tenant'
      and tenant_id is not null
      and landlord_id is null
      and staff_id is null
    )
    or (
      role = 'maintenance'
      and staff_id is not null
      and landlord_id is null
      and tenant_id is null
    )
  )
);

create unique index user_roles_one_landlord
  on public.user_roles (landlord_id)
  where landlord_id is not null;

create unique index user_roles_one_tenant
  on public.user_roles (tenant_id)
  where tenant_id is not null;

create unique index user_roles_one_staff
  on public.user_roles (staff_id)
  where staff_id is not null;

comment on table public.user_roles is
  'Application role for each Auth user. Authorization reads this table, never user_metadata.';

create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.user_roles
  where user_id = (select auth.uid())
$$;

create or replace function private.current_landlord_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select landlord_id
  from public.user_roles
  where user_id = (select auth.uid())
$$;

create or replace function private.current_tenant_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select tenant_id
  from public.user_roles
  where user_id = (select auth.uid())
$$;

create or replace function private.current_staff_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select staff_id
  from public.user_roles
  where user_id = (select auth.uid())
$$;

create or replace function private.current_tenant_unit_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select tenant.unit_id
  from public.user_roles as membership
  join public."Tenants" as tenant on tenant.id = membership.tenant_id
  where membership.user_id = (select auth.uid())
$$;

create or replace function private.current_tenant_property_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select unit.property_id
  from public.user_roles as membership
  join public."Tenants" as tenant on tenant.id = membership.tenant_id
  join public."Units" as unit on unit.id = tenant.unit_id
  where membership.user_id = (select auth.uid())
$$;

create or replace function private.landlord_owns_unit(target_unit bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."Units" as unit
    join public."Properties" as property on property.id = unit.property_id
    where unit.id = target_unit
      and property.landlord_id = (
        select landlord_id
        from public.user_roles
        where user_id = (select auth.uid())
      )
  )
$$;

create or replace function private.staff_assigned_to_unit(target_unit bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."MaintenanceRequests" as request
    where request.unit_id = target_unit
      and request.assigned_staff_id = (
        select staff_id
        from public.user_roles
        where user_id = (select auth.uid())
      )
  )
$$;

create or replace function private.staff_assigned_to_property(target_property bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."MaintenanceRequests" as request
    join public."Units" as unit on unit.id = request.unit_id
    where unit.property_id = target_property
      and request.assigned_staff_id = (
        select staff_id
        from public.user_roles
        where user_id = (select auth.uid())
      )
  )
$$;

create or replace function private.landlord_can_see_tenant(target_tenant bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."Tenants" as tenant
    join public."Units" as unit on unit.id = tenant.unit_id
    join public."Properties" as property on property.id = unit.property_id
    where tenant.id = target_tenant
      and property.landlord_id = (
        select landlord_id
        from public.user_roles
        where user_id = (select auth.uid())
      )
  )
$$;

create or replace function private.staff_can_see_tenant(target_tenant bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."Tenants" as tenant
    join public."MaintenanceRequests" as request on request.unit_id = tenant.unit_id
    where tenant.id = target_tenant
      and request.assigned_staff_id = (
        select staff_id
        from public.user_roles
        where user_id = (select auth.uid())
      )
  )
$$;

create or replace function private.landlord_can_see_staff(target_staff bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."MaintenanceRequests" as request
    join public."Units" as unit on unit.id = request.unit_id
    join public."Properties" as property on property.id = unit.property_id
    where request.assigned_staff_id = target_staff
      and property.landlord_id = (
        select landlord_id
        from public.user_roles
        where user_id = (select auth.uid())
      )
  )
$$;

create or replace function private.tenant_can_see_staff(target_staff bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."MaintenanceRequests" as request
    where request.assigned_staff_id = target_staff
      and request.submitted_by_tenant_id = (
        select tenant_id
        from public.user_roles
        where user_id = (select auth.uid())
      )
  )
$$;

create or replace function private.tenant_can_see_landlord(target_landlord bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as membership
    join public."Tenants" as tenant on tenant.id = membership.tenant_id
    join public."Units" as unit on unit.id = tenant.unit_id
    join public."Properties" as property on property.id = unit.property_id
    where membership.user_id = (select auth.uid())
      and property.landlord_id = target_landlord
  )
$$;

create or replace function private.staff_can_see_landlord(target_landlord bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public."MaintenanceRequests" as request
    join public."Units" as unit on unit.id = request.unit_id
    join public."Properties" as property on property.id = unit.property_id
    where request.assigned_staff_id = (
      select staff_id
      from public.user_roles
      where user_id = (select auth.uid())
    )
      and property.landlord_id = target_landlord
  )
$$;

revoke all on function
  private.current_role(),
  private.current_landlord_id(),
  private.current_tenant_id(),
  private.current_staff_id(),
  private.current_tenant_unit_id(),
  private.current_tenant_property_id(),
  private.landlord_owns_unit(bigint),
  private.staff_assigned_to_unit(bigint),
  private.staff_assigned_to_property(bigint),
  private.landlord_can_see_tenant(bigint),
  private.staff_can_see_tenant(bigint),
  private.landlord_can_see_staff(bigint),
  private.tenant_can_see_staff(bigint),
  private.tenant_can_see_landlord(bigint),
  private.staff_can_see_landlord(bigint)
from public, anon;

grant execute on function
  private.current_role(),
  private.current_landlord_id(),
  private.current_tenant_id(),
  private.current_staff_id(),
  private.current_tenant_unit_id(),
  private.current_tenant_property_id(),
  private.landlord_owns_unit(bigint),
  private.staff_assigned_to_unit(bigint),
  private.staff_assigned_to_property(bigint),
  private.landlord_can_see_tenant(bigint),
  private.staff_can_see_tenant(bigint),
  private.landlord_can_see_staff(bigint),
  private.tenant_can_see_staff(bigint),
  private.tenant_can_see_landlord(bigint),
  private.staff_can_see_landlord(bigint)
to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_landlord bigint;
  matched_tenant bigint;
  matched_staff bigint;
  matches integer;
begin
  select id into matched_landlord
  from public."Landlords"
  where lower(email) = lower(new.email);

  select id into matched_tenant
  from public."Tenants"
  where lower(email) = lower(new.email);

  select id into matched_staff
  from public."Staff"
  where lower(email) = lower(new.email);

  matches := (matched_landlord is not null)::integer
    + (matched_tenant is not null)::integer
    + (matched_staff is not null)::integer;

  if matches = 1 then
    if matched_landlord is not null then
      insert into public.user_roles (user_id, role, landlord_id)
      values (new.id, 'landlord', matched_landlord);
    elsif matched_tenant is not null then
      insert into public.user_roles (user_id, role, tenant_id)
      values (new.id, 'tenant', matched_tenant);
    else
      insert into public.user_roles (user_id, role, staff_id)
      values (new.id, 'maintenance', matched_staff);
    end if;
  end if;

  return new;
exception
  when unique_violation then
    return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.handle_new_user() to postgres, supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

create or replace function private.assign_admin(admin_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select id into target
  from auth.users
  where lower(email) = lower(admin_email);

  if target is null then
    raise exception 'No Auth user with that email';
  end if;

  insert into public.user_roles (user_id, role)
  values (target, 'admin')
  on conflict (user_id) do update
    set role = 'admin',
        landlord_id = null,
        tenant_id = null,
        staff_id = null;
end;
$$;

revoke all on function private.assign_admin(text) from public, anon, authenticated;
grant execute on function private.assign_admin(text) to postgres;

create sequence public.maintenance_request_number_seq start 1000;

create or replace function private.assign_request_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.request_number is null or btrim(new.request_number) = '' then
    new.request_number := 'MR-' || lpad(nextval('public.maintenance_request_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

revoke all on function private.assign_request_number() from public, anon, authenticated;
grant execute on function private.assign_request_number() to postgres, authenticated, service_role;

drop trigger if exists maintenance_requests_assign_number on public."MaintenanceRequests";
create trigger maintenance_requests_assign_number
  before insert on public."MaintenanceRequests"
  for each row
  execute function private.assign_request_number();

create or replace function private.protect_maintenance_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or (select private.current_role()) = 'admin' then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.request_number is distinct from old.request_number
    or new.unit_id is distinct from old.unit_id
    or new.submitted_by_tenant_id is distinct from old.submitted_by_tenant_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.category is distinct from old.category
    or new.created_at is distinct from old.created_at
    or new.is_test_data is distinct from old.is_test_data
  then
    raise exception 'These request fields cannot be changed from this account';
  end if;

  if (select private.current_role()) = 'maintenance'
    and new.assigned_staff_id is distinct from old.assigned_staff_id
  then
    raise exception 'Assigned staff cannot be changed from this account';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_maintenance_request() from public, anon, authenticated;
grant execute on function private.protect_maintenance_request() to postgres, authenticated, service_role;

drop trigger if exists maintenance_requests_protect_fields on public."MaintenanceRequests";
create trigger maintenance_requests_protect_fields
  before update on public."MaintenanceRequests"
  for each row
  execute function private.protect_maintenance_request();

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

alter table public."Landlords" enable row level security;
alter table public."Landlords" force row level security;
alter table public."Properties" enable row level security;
alter table public."Properties" force row level security;
alter table public."Units" enable row level security;
alter table public."Units" force row level security;
alter table public."Tenants" enable row level security;
alter table public."Tenants" force row level security;
alter table public."Staff" enable row level security;
alter table public."Staff" force row level security;
alter table public."MaintenanceRequests" enable row level security;
alter table public."MaintenanceRequests" force row level security;

create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy user_roles_select_auth_admin
  on public.user_roles
  for select
  to supabase_auth_admin
  using (true);

create policy landlords_select
  on public."Landlords"
  for select
  to authenticated
  using (
    (select private.current_role()) = 'admin'
    or id = (select private.current_landlord_id())
    or (select private.tenant_can_see_landlord(id))
    or (select private.staff_can_see_landlord(id))
  );

create policy properties_select
  on public."Properties"
  for select
  to authenticated
  using (
    (select private.current_role()) = 'admin'
    or landlord_id = (select private.current_landlord_id())
    or id = (select private.current_tenant_property_id())
    or (select private.staff_assigned_to_property(id))
  );

create policy units_select
  on public."Units"
  for select
  to authenticated
  using (
    (select private.current_role()) = 'admin'
    or (select private.landlord_owns_unit(id))
    or id = (select private.current_tenant_unit_id())
    or (select private.staff_assigned_to_unit(id))
  );

create policy tenants_select
  on public."Tenants"
  for select
  to authenticated
  using (
    (select private.current_role()) = 'admin'
    or id = (select private.current_tenant_id())
    or (select private.landlord_can_see_tenant(id))
    or (select private.staff_can_see_tenant(id))
  );

create policy staff_select
  on public."Staff"
  for select
  to authenticated
  using (
    (select private.current_role()) = 'admin'
    or id = (select private.current_staff_id())
    or (select private.landlord_can_see_staff(id))
    or (select private.tenant_can_see_staff(id))
  );

create policy maintenance_requests_select
  on public."MaintenanceRequests"
  for select
  to authenticated
  using (
    (select private.current_role()) = 'admin'
    or submitted_by_tenant_id = (select private.current_tenant_id())
    or assigned_staff_id = (select private.current_staff_id())
    or (select private.landlord_owns_unit(unit_id))
  );

create policy maintenance_requests_insert_tenant
  on public."MaintenanceRequests"
  for insert
  to authenticated
  with check (
    (select private.current_role()) = 'tenant'
    and submitted_by_tenant_id = (select private.current_tenant_id())
    and unit_id = (select private.current_tenant_unit_id())
    and status = 'Open'
    and assigned_staff_id is null
    and started_at is null
    and closed_at is null
    and scheduled_for is null
    and hold_reason is null
    and next_follow_up_date is null
    and resolution_notes is null
    and is_test_data = false
  );

create policy maintenance_requests_update
  on public."MaintenanceRequests"
  for update
  to authenticated
  using (
    (select private.current_role()) = 'admin'
    or (
      (select private.current_role()) = 'landlord'
      and (select private.landlord_owns_unit(unit_id))
    )
    or (
      (select private.current_role()) = 'maintenance'
      and assigned_staff_id = (select private.current_staff_id())
    )
  )
  with check (
    (select private.current_role()) = 'admin'
    or (
      (select private.current_role()) = 'landlord'
      and (select private.landlord_owns_unit(unit_id))
    )
    or (
      (select private.current_role()) = 'maintenance'
      and assigned_staff_id = (select private.current_staff_id())
    )
  );

revoke all on table
  public.user_roles,
  public."Landlords",
  public."Properties",
  public."Units",
  public."Tenants",
  public."Staff",
  public."MaintenanceRequests"
from anon, authenticated;

grant select on table
  public.user_roles,
  public."Landlords",
  public."Properties",
  public."Units",
  public."Tenants",
  public."Staff",
  public."MaintenanceRequests"
to authenticated;

grant insert, update on table public."MaintenanceRequests" to authenticated;
grant select on table public.user_roles to supabase_auth_admin;

revoke all on all sequences in schema public from anon, authenticated;

do $$
declare
  identity_sequence regclass;
begin
  select pg_get_serial_sequence('public."MaintenanceRequests"', 'id')::regclass
    into identity_sequence;
  if identity_sequence is not null then
    execute format('grant usage, select on sequence %s to authenticated', identity_sequence);
  end if;
end $$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  found_role public.app_role;
  found_landlord bigint;
  found_tenant bigint;
  found_staff bigint;
begin
  select role, landlord_id, tenant_id, staff_id
    into found_role, found_landlord, found_tenant, found_staff
  from public.user_roles
  where user_id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', coalesce(to_jsonb(found_role), 'null'::jsonb));
  claims := jsonb_set(claims, '{landlord_id}', coalesce(to_jsonb(found_landlord), 'null'::jsonb));
  claims := jsonb_set(claims, '{tenant_id}', coalesce(to_jsonb(found_tenant), 'null'::jsonb));
  claims := jsonb_set(claims, '{staff_id}', coalesce(to_jsonb(found_staff), 'null'::jsonb));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
