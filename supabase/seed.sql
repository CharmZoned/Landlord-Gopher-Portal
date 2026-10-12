-- Sample tenant for project bgjkjtfgrfiszbzatriq.
-- 1. Apply supabase/schema.sql if the tables are missing.
-- 2. In Authentication → Users, add tenant@example.com and set a password.
-- 3. Run this script. It is safe to run again.

do $$
declare
  tenant uuid;
  unit uuid;
begin
  if to_regclass('public.profiles') is null
    or to_regclass('public.units') is null
    or to_regclass('public.leases') is null
  then
    raise exception 'Apply supabase/schema.sql before seeding.';
  end if;

  select id into tenant
  from auth.users
  where email = 'tenant@example.com';

  if tenant is null then
    raise exception
      'Create an Auth user with email tenant@example.com, then run this seed again.';
  end if;

  insert into public.profiles (id, full_name, phone)
  values (tenant, 'Jordan Hale', '(512) 555-0148')
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone;

  select id into unit
  from public.units
  where property_name = 'Oak Court Apartments'
    and unit_number = '4B'
  limit 1;

  if unit is null then
    insert into public.units (
      property_name,
      address_line,
      city,
      unit_number,
      bedrooms,
      bathrooms
    )
    values (
      'Oak Court Apartments',
      '1840 Oak Court',
      'Austin, TX 78702',
      '4B',
      2,
      1
    )
    returning id into unit;
  end if;

  if not exists (
    select 1
    from public.leases
    where tenant_id = tenant
      and status = 'active'
  ) then
    insert into public.leases (
      tenant_id,
      unit_id,
      rent_amount,
      due_day,
      start_date,
      end_date,
      status
    )
    values (
      tenant,
      unit,
      1850.00,
      1,
      date '2025-06-01',
      date '2026-05-31',
      'active'
    );
  end if;
end $$;
