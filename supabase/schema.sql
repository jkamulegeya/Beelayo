-- =============================================
-- Belayo - Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Events table
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique default substr(md5(random()::text), 1, 12),
  title text not null,
  description text,
  event_date timestamptz,
  location text,
  inviter_name text,
  poster_url text,
  invite_capacity integer not null default 10,
  created_at timestamptz not null default now()
);

-- RSVPs table
create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  guests integer not null default 1,
  guest_details jsonb,
  response text not null check (response in ('yes', 'no', 'maybe')),
  note text,
  created_at timestamptz not null default now()
);

-- Index for fast counting
create index rsvps_event_idx on public.rsvps (event_id);
create index events_user_idx on public.events (user_id);

-- Real-time for the events table (needed for the dashboard live counter)
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.rsvps;

-- Payments / upgrades log
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  amount integer not null,
  tier text,
  network text,
  phone text,
  provider_ref text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_owner_all" on public.payments
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.payments;

-- =============================================
-- Capacity enforcement (package tiers)
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

-- =============================================
-- Row Level Security
-- =============================================
alter table public.events enable row level security;
alter table public.rsvps enable row level security;

-- Events: owner can do anything, public can read by slug
create policy "events_owner_all" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "events_public_read" on public.events
  for select using (true);

-- RSVPs: anyone can insert, owner can read
create policy "rsvps_public_insert" on public.rsvps
  for insert with check (true);

create policy "rsvps_owner_select" on public.rsvps
  for select using (
    exists (
      select 1 from public.events e
      where e.id = rsvps.event_id and e.user_id = auth.uid()
    )
  );

create policy "rsvps_owner_delete" on public.rsvps
  for delete using (
    exists (
      select 1 from public.events e
      where e.id = rsvps.event_id and e.user_id = auth.uid()
    )
  );

-- =============================================
-- Storage: posters / banners bucket (max 3MB enforced client-side)
-- =============================================
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do update set public = true;

-- Anyone can view poster images
create policy "posters_public_select" on storage.objects
  for select using (bucket_id = 'posters');

-- Only signed-in users can upload, and only into their own folder
create policy "posters_auth_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "posters_auth_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "posters_auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);

-- =============================================
-- Tiered guest-limit plans (account-level, DB-enforced)
-- free 10 / Basic 25 (10,000) / Pro 50 (25,000) /
-- Pro Max 100 (50,000) / Deluxe 200 (100,000)
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'Basic', 'Pro', 'Pro Max', 'Deluxe')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

create or replace function public.plan_guest_limit(p_plan text)
returns integer
language sql
immutable
as $$
  select case p_plan
    when 'Basic' then 25
    when 'Pro' then 50
    when 'Pro Max' then 100
    when 'Deluxe' then 200
    else 10
  end
$$;

create or replace function public.effective_guest_limit(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select plan_guest_limit(p.plan)
      from public.profiles p
     where p.id = p_user_id
       and (p.plan_expires_at is null or p.plan_expires_at > now())
  ), 10)
$$;

create or replace function public.get_my_account()
returns table (plan text, plan_expires_at timestamptz, guest_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id)
  values (v_uid)
  on conflict (id) do nothing;

  return query
    select p.plan, p.plan_expires_at, effective_guest_limit(p.id) as guest_limit
      from public.profiles p
     where p.id = v_uid;
end;
$$;

revoke all on function public.get_my_account() from public;
grant execute on function public.get_my_account() to authenticated;

create or replace function public.get_event_guest_limit(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select effective_guest_limit(e.user_id)
      from public.events e
     where e.id = p_event_id
  ), 10)
$$;

revoke all on function public.get_event_guest_limit(uuid) from public;
grant execute on function public.get_event_guest_limit(uuid) to anon, authenticated;

create or replace function public.enforce_plan_guest_limit()
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

  select effective_guest_limit(e.user_id)
    into cap
    from public.events e
   where e.id = new.event_id;

  cap := coalesce(cap, 10);

  select coalesce(sum(r.guests), 0)
    into used
    from public.rsvps r
   where r.event_id = new.event_id
     and r.response in ('yes', 'maybe');

  if used + coalesce(new.guests, 1) > cap then
    raise exception 'PLAN_LIMIT_REACHED: this plan allows % guests per event. The host can upgrade to invite more.', cap
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_rsvp_over_capacity on public.rsvps;
drop trigger if exists enforce_plan_guest_limit on public.rsvps;

create trigger enforce_plan_guest_limit
  before insert or update of guests, response on public.rsvps
  for each row
  execute function public.enforce_plan_guest_limit();

drop function if exists public.prevent_rsvp_over_capacity();

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_ref text unique not null,
  plan text not null,
  amount integer not null,
  network text,
  phone text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  created_at timestamptz not null default now()
);

alter table public.payment_intents enable row level security;

create policy "payment_intents_owner_all" on public.payment_intents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.payment_intents;
exception when duplicate_object then null;
end $$;

alter table public.payments alter column event_id drop not null;

create or replace function public.dev_apply_plan_upgrade(p_ref text, p_plan text, p_amount integer)
returns table (plan text, plan_expires_at timestamptz, guest_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exp timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_ref is null or left(p_ref, 4) <> 'DEV-' then
    raise exception 'Cannot apply upgrade: use the verify-payment endpoint for real transactions.';
  end if;

  insert into public.payment_intents (user_id, provider_ref, plan, amount, status)
  values (v_uid, p_ref, p_plan, p_amount, 'paid')
  on conflict (provider_ref) do nothing;

  v_exp := now() + interval '30 days';

  insert into public.profiles (id, plan, plan_expires_at)
  values (v_uid, p_plan, v_exp)
  on conflict (id) do update
    set plan = excluded.plan,
        plan_expires_at = excluded.plan_expires_at,
        updated_at = now();

  insert into public.payments (user_id, event_id, amount, tier, network, phone, provider_ref, status)
  select v_uid, null, p_amount, p_plan, 'DEV', 'DEV', p_ref, 'paid'
  where not exists (select 1 from public.payments where provider_ref = p_ref);

  return query
    select pp.plan, pp.plan_expires_at, effective_guest_limit(pp.id)
      from public.profiles pp
     where pp.id = v_uid;
end;
$$;

revoke all on function public.dev_apply_plan_upgrade(text, text, integer) from public;
grant execute on function public.dev_apply_plan_upgrade(text, text, integer) to authenticated;
