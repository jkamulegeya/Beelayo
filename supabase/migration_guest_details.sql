-- Add JSON column for per-guest details (name/email/phone) collected on RSVP
alter table public.rsvps
  add column if not exists guest_details jsonb;