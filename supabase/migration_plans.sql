-- =====================================================================
-- Belayo - Tiered guest-limit plans (account-level, DB-enforced)
-- Plans:  free     -> up to 10 guests/event (no cost)
--         Basic    -> up to 25 guests/event  = UGX 10,000
--         Pro      -> up to 50 guests/event  = UGX 25,000
--         Pro Max  -> up to 100 guests/event = UGX 50,000
--         Deluxe   -> up to 200 guests/event = UGX 100,000
--
-- Enforcement lives in the DB (BEFORE INSERT/UPDATE trigger on rsvps),
-- so inserts via the API are blocked just like app inserts.
-- =====================================================================

-- 1) profiles: one row per auth user, holds the subscription plan
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'Basic', 'Pro', 'Pro Max', 'Deluxe')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Profiles go into realtime so event pages update the live plan/limit counter.
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- 2) plan -> limit lookup (pure, immutable)
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

-- 3) effective limit for a user: an expired plan behaves as 'free'
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

-- 4) RPC for the owner: ensures a profile row exists and returns the live plan
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

-- 5) public RPC so the (anonymous) invitation page can show the right limit
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

-- 6) DB-layer enforcement trigger on rsvps
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

-- 7) Payment intents: created by the momo-checkout edge function (service role)
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

drop policy if exists "payment_intents_owner_all" on public.payment_intents;
create policy "payment_intents_owner_all" on public.payment_intents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.payment_intents;
exception when duplicate_object then null;
end $$;

-- payments.event_id used to be required (per-event purchases); plans are now
-- account-level, so allow it to be null.
alter table public.payments alter column event_id drop not null;

-- 8) DEV-ONLY fallback used while the momo gateway / edge functions are not
--    deployed. Only accepts DEV- prefixed refs that the client cannot forge.
--    Production upgrades MUST go through verify-payment / payment-webhook.
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