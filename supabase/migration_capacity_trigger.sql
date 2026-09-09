-- =============================================
-- Belayo - Enforce guest capacity per event
-- Blocks RSVP submissions (yes/maybe) that would
-- exceed the event's invite_capacity (package tier).
-- Declines ("no") never occupy a slot.
-- =============================================

create or replace function public.prevent_rsvp_over_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  used integer;
begin
  if new.response not in ('yes', 'maybe') then
    return new;
  end if;

  select coalesce(max(e.invite_capacity), 10)
    into cap
    from public.events e
   where e.id = new.event_id;

  select coalesce(sum(r.guests), 0)
    into used
    from public.rsvps r
   where r.event_id = new.event_id
     and r.response in ('yes', 'maybe');

  if used + coalesce(new.guests, 1) > cap then
    raise exception 'This event has reached its guest capacity of % people. Please contact the host for more information.', cap;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_rsvp_over_capacity on public.rsvps;

create trigger prevent_rsvp_over_capacity
  before insert on public.rsvps
  for each row
  execute function public.prevent_rsvp_over_capacity();