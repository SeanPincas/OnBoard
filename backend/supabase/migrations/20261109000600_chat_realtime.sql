-- OnBoard Phase 8 chat and Supabase Realtime foundation

create or replace function public.get_or_create_conversation(
  p_property_id uuid,
  p_room_id uuid,
  p_tenant_profile_id uuid default null
)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile_id uuid;
  actor_role public.app_role;
  landlord_profile_id uuid;
  tenant_profile_id uuid;
  conversation public.conversations;
begin
  select id, role into actor_profile_id, actor_role
  from public.profiles
  where clerk_user_id = public.current_clerk_user_id();

  if actor_profile_id is null then
    raise exception 'profile required';
  end if;

  select p.landlord_profile_id into landlord_profile_id
  from public.properties p
  where p.id = p_property_id
    and p.publication_status = 'published';

  if landlord_profile_id is null then
    raise exception 'published property required';
  end if;

  if p_room_id is not null and not exists (
    select 1 from public.rooms r
    where r.id = p_room_id
      and r.property_id = p_property_id
      and r.publication_status = 'published'
  ) then
    raise exception 'published room does not belong to property';
  end if;

  if actor_role = 'tenant' then
    tenant_profile_id := actor_profile_id;
  elsif actor_role = 'landlord' then
    tenant_profile_id := p_tenant_profile_id;
    if tenant_profile_id is null then
      raise exception 'tenant profile is required for landlord conversations';
    end if;
    if not exists (
      select 1 from public.profiles t
      where t.id = tenant_profile_id and t.role = 'tenant'
    ) then
      raise exception 'tenant profile required';
    end if;
    if landlord_profile_id <> actor_profile_id then
      raise exception 'landlord access required';
    end if;
  else
    raise exception 'tenant or landlord profile required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_property_id::text || ':' || coalesce(p_room_id::text, '') || ':' || tenant_profile_id::text,
    0
  ));

  select c.* into conversation
  from public.conversations c
  join public.conversation_participants tenant_participant
    on tenant_participant.conversation_id = c.id
   and tenant_participant.profile_id = tenant_profile_id
  join public.conversation_participants landlord_participant
    on landlord_participant.conversation_id = c.id
   and landlord_participant.profile_id = landlord_profile_id
  where c.property_id = p_property_id
    and c.room_id is not distinct from p_room_id
    and c.status = 'open'
  limit 1;

  if conversation.id is not null then
    return conversation;
  end if;

  insert into public.conversations (property_id, room_id)
  values (p_property_id, p_room_id)
  returning * into conversation;

  insert into public.conversation_participants (conversation_id, profile_id)
  values
    (conversation.id, tenant_profile_id),
    (conversation.id, landlord_profile_id);

  return conversation;
end;
$$;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_profile_id uuid;
  message public.messages;
begin
  select p.id into sender_profile_id
  from public.profiles p
  join public.conversation_participants cp on cp.profile_id = p.id
  where cp.conversation_id = p_conversation_id
    and p.clerk_user_id = public.current_clerk_user_id();

  if sender_profile_id is null then
    raise exception 'conversation access required';
  end if;

  if char_length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'message must contain between 1 and 4000 characters';
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.status = 'open'
  ) then
    raise exception 'conversation is closed or missing';
  end if;

  insert into public.messages (conversation_id, sender_profile_id, body)
  values (p_conversation_id, sender_profile_id, trim(p_body))
  returning * into message;

  return message;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid, uuid, uuid) from public;
grant execute on function public.get_or_create_conversation(uuid, uuid, uuid) to authenticated;
revoke all on function public.send_message(uuid, text) from public;
grant execute on function public.send_message(uuid, text) to authenticated;

-- Private Realtime channels: conversation participants may receive and publish
-- only on their own conversation topic. Broadcast payloads are not persistence.
create policy conversation_participants_can_receive_realtime
on realtime.messages for select to authenticated
using (
  realtime.topic() like 'conversation:%'
  and exists (
    select 1
    from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    where cp.conversation_id = replace(realtime.topic(), 'conversation:', '')::uuid
      and p.clerk_user_id = public.current_clerk_user_id()
  )
);

create policy conversation_participants_can_send_realtime
on realtime.messages for insert to authenticated
with check (
  realtime.topic() like 'conversation:%'
  and exists (
    select 1
    from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    where cp.conversation_id = replace(realtime.topic(), 'conversation:', '')::uuid
      and p.clerk_user_id = public.current_clerk_user_id()
  )
);
