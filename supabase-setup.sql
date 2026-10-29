create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 300),
  work_date date,
  image_path text,
  week smallint check (week between 1 and 15),
  created_at timestamptz not null default now()
);

-- เพิ่มคอลัมน์ week สำหรับระบุสัปดาห์ที่ 1 - 15 (กรณีมีตาราง works อยู่ก่อนแล้ว)
alter table public.works add column if not exists week smallint check (week between 1 and 15);

alter table public.works disable row level security;

-- ให้สิทธิ์กับ anon และ authenticated ในการจัดการข้อมูลตาราง
grant all on public.works to anon, authenticated;

-- 3. สร้าง Bucket สำหรับเก็บรูปภาพผลงาน
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

-- 4. ตั้งค่านโยบาย Storage ให้อนุญาตอ่าน/อัปโหลด/ลบรูปได้ผ่าน anon key
drop policy if exists "Public view work images" on storage.objects;
create policy "Public view work images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'work-images');

drop policy if exists "Public upload work images" on storage.objects;
create policy "Public upload work images"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'work-images');

drop policy if exists "Public update work images" on storage.objects;
create policy "Public update work images"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'work-images')
  with check (bucket_id = 'work-images');

drop policy if exists "Public delete work images" on storage.objects;
create policy "Public delete work images"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'work-images');
