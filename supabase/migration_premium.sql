-- =============================================
-- Belayo - Premium guest capacity
-- Free events: 10 invite slots. Upgrades expand it.
-- =============================================

-- Guest capacity per event (slots for inviting people)
alter table public.events
  add column if not exists invite_capacity integer not null default 10;

-- Payments / upgrades log
create table if not exists public.payments (
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