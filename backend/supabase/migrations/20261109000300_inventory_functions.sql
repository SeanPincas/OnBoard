-- OnBoard Phase 5 inventory helpers

create or replace function public.create_property(
  p_title text,
  p_description text,
  p_city public.city_name,
  p_address text,
  p_landmark text,
  p_latitude double precision,
  p_longitude double precision,
  p_amenities jsonb,
  p_house_rules jsonb,
  p_occupancy_restriction text
)
returns public.properties
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  created_property public.properties;
  landlord_id uuid;
begin
  select id into landlord_id
  from public.profiles
  where clerk_user_id = public.current_clerk_user_id()
    and role = 'landlord';

  if landlord_id is null then
    raise exception 'landlord profile required';
  end if;

  insert into public.properties (
    landlord_profile_id, title, description, city, address, landmark, location,
    amenities, house_rules, occupancy_restriction
  )
  values (
    landlord_id, p_title, p_description, p_city, p_address, p_landmark,
    extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography,
    coalesce(p_amenities, '[]'::jsonb), coalesce(p_house_rules, '{}'::jsonb),
    p_occupancy_restriction
  )
  returning * into created_property;

  return created_property;
end;
$$;

revoke all on function public.create_property(
  text, text, public.city_name, text, text, double precision, double precision, jsonb, jsonb, text
) from public;
grant execute on function public.create_property(
  text, text, public.city_name, text, text, double precision, double precision, jsonb, jsonb, text
) to authenticated;
