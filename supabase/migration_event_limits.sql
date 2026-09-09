-- =============================================
-- Event creation limit: at most 2 active events per user.
-- An event counts as active while its date is in the future
-- (or has no date). Past-date events are expired and free up a slot.
-- =============================================
create or replace function public.limit_active_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count integer;
begin
  select count(*) into active_count
    from public.events
   where user_id = new.user_id
     and (event_date is null or event_date >= now());

  if active_count >= 2 then
    raise exception 'Event limit reached: you can have at most 2 active events. Delete an event or wait for one to expire before creating another.';
  end if;

  return new;
end;
$$;

drop trigger if exists limit_active_events on public.events;

create trigger limit_active_events
  before insert on public.events
  for each row
  execute function public.limit_active_events();