-- 1. Create the owner in Supabase Dashboard > Authentication > Users.
-- 2. Replace the UUID below with that user's ID, then run this entire file
--    in Supabase Dashboard > SQL Editor.

create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  owner_id uuid not null
);

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;

insert into public.site_settings (id, owner_id)
values (1, '2744b665-a400-415a-9c3d-bb6d74c045fc'::uuid)
on conflict (id) do update set owner_id = excluded.owner_id;

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 300),
  work_date date,
  image_path text,
  created_at timestamptz not null default now()
);

alter table public.works enable row level security;

drop policy if exists "Anyone can view works" on public.works;
create policy "Anyone can view works"
  on public.works for select
  to anon, authenticated
  using (true);

drop policy if exists "Only owner can add works" on public.works;
create policy "Only owner can add works"
  on public.works for insert
  to authenticated
  with check (
    auth.uid() = (select owner_id from public.site_settings where id = 1)
  );

drop policy if exists "Only owner can edit works" on public.works;
create policy "Only owner can edit works"
  on public.works for update
  to authenticated
  using (
    auth.uid() = (select owner_id from public.site_settings where id = 1)
  )
  with check (
    auth.uid() = (select owner_id from public.site_settings where id = 1)
  );

drop policy if exists "Only owner can delete works" on public.works;
create policy "Only owner can delete works"
  on public.works for delete
  to authenticated
  using (
    auth.uid() = (select owner_id from public.site_settings where id = 1)
  );

grant select on public.works to anon, authenticated;
grant insert, update, delete on public.works to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'work-images',
  'work-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Only owner can upload work images" on storage.objects;
create policy "Only owner can upload work images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'work-images'
    and auth.uid() = (select owner_id from public.site_settings where id = 1)
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Only owner can replace work images" on storage.objects;
create policy "Only owner can replace work images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'work-images'
    and auth.uid() = (select owner_id from public.site_settings where id = 1)
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'work-images'
    and auth.uid() = (select owner_id from public.site_settings where id = 1)
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Only owner can delete work images" on storage.objects;
create policy "Only owner can delete work images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'work-images'
    and auth.uid() = (select owner_id from public.site_settings where id = 1)
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.owner_pin_attempts (
  ip_hash text primary key check (char_length(ip_hash) = 64),
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);

alter table public.owner_pin_attempts enable row level security;
revoke all on public.owner_pin_attempts from public, anon, authenticated;
grant all on public.owner_pin_attempts to service_role;
create index if not exists owner_pin_attempts_window_started_idx
  on public.owner_pin_attempts (window_started_at);

create or replace function public.owner_pin_check_attempt(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_count integer;
  window_start timestamptz;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    return false;
  end if;

  delete from public.owner_pin_attempts
    where window_started_at < now() - interval '24 hours';

  insert into public.owner_pin_attempts (ip_hash, window_started_at, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
  set attempts = case
        when public.owner_pin_attempts.window_started_at < now() - interval '15 minutes' then 1
        else public.owner_pin_attempts.attempts + 1
      end,
      window_started_at = case
        when public.owner_pin_attempts.window_started_at < now() - interval '15 minutes' then now()
        else public.owner_pin_attempts.window_started_at
      end;

  select attempts, window_started_at
    into attempt_count, window_start
    from public.owner_pin_attempts
    where ip_hash = p_ip_hash;

  return attempt_count <= 5 and window_start >= now() - interval '15 minutes';
end;
$$;

create or replace function public.owner_pin_clear_attempts(p_ip_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.owner_pin_attempts where ip_hash = p_ip_hash;
$$;

revoke all on function public.owner_pin_check_attempt(text) from public, anon, authenticated;
revoke all on function public.owner_pin_clear_attempts(text) from public, anon, authenticated;
grant execute on function public.owner_pin_check_attempt(text) to service_role;
grant execute on function public.owner_pin_clear_attempts(text) to service_role;
