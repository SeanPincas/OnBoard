-- OnBoard Phase 7 reservation workflow

create or replace function public.create_reservation_request(
  p_property_id uuid,
  p_room_id uuid,
  p_bed_space_id uuid,
  p_requested_occupants integer,
  p_intended_move_in date,
  p_message text
)
returns public.reservation_requests
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_request public.reservation_requests;
  tenant_id uuid;
  room_record public.rooms;
begin
  select id into tenant_id
  from public.profiles
  where clerk_user_id = public.current_clerk_user_id() and role = 'tenant';

  if tenant_id is null then
    raise exception 'tenant profile required';
  end if;

  select r.* into room_record
  from public.rooms r
  where r.id = p_room_id and r.property_id = p_property_id and r.publication_status = 'published';

  if room_record.id is null then raise exception 'published room not found'; end if;
  if p_requested_occupants < 1 or p_requested_occupants > room_record.capacity then raise exception 'invalid occupant count'; end if;
  if p_bed_space_id is not null then
    if room_record.room_type <> 'shared' or p_requested_occupants <> 1 then raise exception 'invalid bed-space request'; end if;
    if not exists (select 1 from public.bed_spaces where id = p_bed_space_id and room_id = p_room_id and publication_status = 'published') then
      raise exception 'published bed space not found';
    end if;
  end if;

  insert into public.reservation_requests (
    tenant_profile_id, property_id, room_id, bed_space_id, requested_occupants, intended_move_in, message, agreed_monthly_rent
  )
  values (tenant_id, p_property_id, p_room_id, p_bed_space_id, p_requested_occupants, p_intended_move_in, p_message, room_record.monthly_rent)
  returning * into created_request;

  return created_request;
end;
$$;

create or replace function public.review_reservation_request(
  p_reservation_id uuid,
  p_action text
)
returns public.reservation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation public.reservation_requests;
  room_record public.rooms;
  landlord_id uuid;
  tenant_id uuid;
  available_count integer;
  allocation public.inventory_allocations;
begin
  select rr.* into reservation
  from public.reservation_requests rr
  where rr.id = p_reservation_id
  for update;

  if reservation.id is null then raise exception 'reservation not found'; end if;

  select r.* into room_record from public.rooms r where r.id = reservation.room_id for update;
  select id into landlord_id from public.profiles where clerk_user_id = public.current_clerk_user_id() and role = 'landlord';
  select id into tenant_id from public.profiles where clerk_user_id = public.current_clerk_user_id() and role = 'tenant';

  if p_action = 'cancel' then
    if tenant_id is null or reservation.tenant_profile_id <> tenant_id then raise exception 'tenant access required'; end if;
    if reservation.status not in ('pending', 'confirmed') then raise exception 'reservation cannot be cancelled'; end if;
    update public.reservation_requests set status = 'cancelled' where id = reservation.id returning * into reservation;
    update public.inventory_allocations set status = 'released' where reservation_request_id = reservation.id and status in ('reserved', 'occupied');
    return reservation;
  end if;

  if landlord_id is null or not exists (
    select 1 from public.properties p where p.id = reservation.property_id and p.landlord_profile_id = landlord_id
  ) then raise exception 'landlord access required'; end if;

  if p_action = 'decline' then
    if reservation.status <> 'pending' then raise exception 'only pending reservations can be declined'; end if;
    update public.reservation_requests set status = 'declined' where id = reservation.id returning * into reservation;
    return reservation;
  end if;

  if p_action = 'move_in' then
    if reservation.status <> 'confirmed' then raise exception 'only confirmed reservations can move in'; end if;
    update public.inventory_allocations set status = 'occupied'
    where reservation_request_id = reservation.id and status = 'reserved';
    return reservation;
  end if;

  if p_action <> 'confirm' or reservation.status <> 'pending' then raise exception 'only pending reservations can be confirmed'; end if;

  if reservation.bed_space_id is not null then
    if exists (select 1 from public.inventory_allocations where bed_space_id = reservation.bed_space_id and status in ('reserved', 'occupied')) then
      raise exception 'requested bed space is no longer available';
    end if;
  else
    if exists (select 1 from public.bed_spaces where room_id = room_record.id and publication_status = 'published') then
      select greatest(count(bs.id)::integer - count(ia.id)::integer, 0) into available_count
      from public.bed_spaces bs
      left join public.inventory_allocations ia on ia.bed_space_id = bs.id and ia.status in ('reserved', 'occupied')
      where bs.room_id = room_record.id and bs.publication_status = 'published';
    else
      select greatest(room_record.capacity - coalesce(sum(ia.occupant_count), 0)::integer, 0) into available_count
      from public.inventory_allocations ia
      where ia.room_id = room_record.id and ia.bed_space_id is null and ia.status in ('reserved', 'occupied');
    end if;
    if reservation.requested_occupants > available_count then raise exception 'room no longer has enough capacity'; end if;
  end if;

  insert into public.inventory_allocations (
    reservation_request_id, room_id, bed_space_id, occupant_count, status, starts_on
  )
  values (
    reservation.id, reservation.room_id, reservation.bed_space_id, reservation.requested_occupants, 'reserved', reservation.intended_move_in
  )
  returning * into allocation;

  update public.reservation_requests set status = 'confirmed' where id = reservation.id returning * into reservation;
  return reservation;
end;
$$;

revoke all on function public.create_reservation_request(uuid, uuid, uuid, integer, date, text) from public;
grant execute on function public.create_reservation_request(uuid, uuid, uuid, integer, date, text) to authenticated;
revoke all on function public.review_reservation_request(uuid, text) from public;
grant execute on function public.review_reservation_request(uuid, text) to authenticated;

-- Reservation state transitions must go through the transactional function.
drop policy if exists reservations_landlord_update on public.reservation_requests;
