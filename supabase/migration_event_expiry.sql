-- =============================================
-- Belayo - Event expiry / auto-delete
-- 1. RSVPs are rejected once the event date has passed (guests see "closed").
-- 2. A pg_cron job deletes events 24 hours after their event date.
--    Deleting an event cascade-deletes its RSVPs (and payment log rows
--    pointing at it), so the invite link goes dead for everyone.
-- =============================================

-- ---------------------------------------------------------------------------
-- 1) Prevent new RSVPs after the event date
-- ---------------------------------------------------------------------------
create or replace function public.prevent_rsvp_on_closed_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date timestamptz;
begin
  select event_date into v_date
    from public.events
   where id = new.event_id;

  if v_date is not null and now() > v_date then
    raise exception using
      errcode = 'P0001',
      message = 'EVENT_CLOSED: this invitation has closed and is no longer accepting RSVPs.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_rsvp_on_closed_event on public.rsvps;

create trigger prevent_rsvp_on_closed_event
  before insert on public.rsvps
  for each row
  execute function public.prevent_rsvp_on_closed_event();

-- ---------------------------------------------------------------------------
-- 2) Auto-delete events 24 hours after their date
-- ---------------------------------------------------------------------------
-- Remove any previous schedule under the same name so re-running is safe.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'belayo-purge-expired-events') then
    perform cron.unschedule('belayo-purge-expired-events');
  end if;
end $$;

select cron.schedule(
  'belayo-purge-expired-events',
  '*/5 * * * *',
  $belayo$
    delete from public.events
      where event_date is not null
        and event_date + interval '24 hours' < now();
  $belayo$
);