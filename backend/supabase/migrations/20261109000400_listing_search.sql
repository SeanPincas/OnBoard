-- OnBoard Phase 6 public listing search

create or replace function public.search_listings(
  p_city public.city_name default null,
  p_search text default null,
  p_min_rent numeric default null,
  p_max_rent numeric default null,
  p_room_type public.room_type default null,
  p_include_unavailable boolean default false,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_meters double precision default null,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  property_id uuid,
  room_id uuid,
  property_title text,
  room_title text,
  city public.city_name,
  address text,
  landmark text,
  latitude double precision,
  longitude double precision,
  room_type public.room_type,
  rental_basis public.rental_basis,
  monthly_rent numeric,
  capacity integer,
  available_count integer,
  photos jsonb,
  distance_meters double precision,
  publication_status public.publication_status
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with bed_inventory as (
    select
      bs.room_id,
      count(bs.id)::integer as total_beds,
      count(ba.id)::integer as active_beds
    from public.bed_spaces bs
    left join public.inventory_allocations ba
      on ba.bed_space_id = bs.id and ba.status in ('reserved', 'occupied')
    where bs.publication_status = 'published'
    group by bs.room_id
  ),
  room_allocations as (
    select room_id, coalesce(sum(occupant_count), 0)::integer as active_occupants
    from public.inventory_allocations
    where bed_space_id is null and status in ('reserved', 'occupied')
    group by room_id
  ),
  room_inventory as (
    select
      r.id as room_id,
      r.property_id,
      r.capacity::integer,
      case
        when coalesce(beds.total_beds, 0) > 0 then greatest(
          beds.total_beds - beds.active_beds,
          0
        )
        else greatest(
          r.capacity::integer - coalesce(allocations.active_occupants, 0),
          0
        )
      end as available_count
    from public.rooms r
    left join bed_inventory beds on beds.room_id = r.id
    left join room_allocations allocations on allocations.room_id = r.id
  )
  select
    p.id,
    r.id,
    p.title,
    r.title,
    p.city,
    p.address,
    p.landmark,
    extensions.ST_Y(p.location::geometry),
    extensions.ST_X(p.location::geometry),
    r.room_type,
    r.rental_basis,
    r.monthly_rent,
    inventory.capacity,
    inventory.available_count,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', lp.id,
        'url', lp.public_url,
        'sortOrder', lp.sort_order
      ) order by lp.sort_order)
      from public.listing_photos lp
      where lp.room_id = r.id or lp.property_id = p.id
    ), '[]'::jsonb),
    case
      when p_latitude is null or p_longitude is null then null
      else extensions.ST_Distance(
        p.location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
      )
    end,
    r.publication_status
  from public.properties p
  join public.rooms r on r.property_id = p.id
  join room_inventory inventory on inventory.room_id = r.id
  where p.publication_status = 'published'
    and r.publication_status = 'published'
    and (p_city is null or p.city = p_city)
    and (p_search is null or (
      lower(p.title) like '%' || lower(p_search) || '%'
      or lower(r.title) like '%' || lower(p_search) || '%'
      or lower(p.address) like '%' || lower(p_search) || '%'
      or lower(coalesce(p.landmark, '')) like '%' || lower(p_search) || '%'
    ))
    and (p_min_rent is null or r.monthly_rent >= p_min_rent)
    and (p_max_rent is null or r.monthly_rent <= p_max_rent)
    and (p_room_type is null or r.room_type = p_room_type)
    and (p_include_unavailable or inventory.available_count > 0)
    and (
      p_latitude is null or p_longitude is null or p_radius_meters is null
      or extensions.ST_DWithin(
        p.location,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography,
        p_radius_meters
      )
    )
  order by
    case when p_latitude is not null and p_longitude is not null then extensions.ST_Distance(
      p.location,
      extensions.ST_SetSRID(extensions.ST_MakePoint(p_longitude, p_latitude), 4326)::extensions.geography
    ) end asc nulls last,
    r.monthly_rent asc,
    p.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_listings(
  public.city_name, text, numeric, numeric, public.room_type, boolean,
  double precision, double precision, double precision, integer, integer
) from public;
grant execute on function public.search_listings(
  public.city_name, text, numeric, numeric, public.room_type, boolean,
  double precision, double precision, double precision, integer, integer
) to anon, authenticated;
