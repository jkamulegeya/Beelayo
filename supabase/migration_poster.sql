-- =============================================
-- Migration: event poster/banner + inviter name
-- Safe to run multiple times (idempotent)
-- =============================================

alter table public.events add column if not exists inviter_name text;
alter table public.events add column if not exists poster_url text;

-- Posters storage bucket (public read)
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do update set public = true;

-- Storage policies (each wrapped in DO block so they're idempotent)
do $$
begin
  create policy "posters_public_select" on storage.objects
    for select using (bucket_id = 'posters');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "posters_auth_insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "posters_auth_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "posters_auth_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text);
exception when duplicate_object then null;
end $$;