-- Bucket for trade screenshots (public URLs for <img src>; uploads restricted to own user folder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-images',
  'trade-images',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "trade_images_insert_own" on storage.objects;
create policy "trade_images_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'trade-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "trade_images_update_own" on storage.objects;
create policy "trade_images_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'trade-images'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'trade-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "trade_images_delete_own" on storage.objects;
create policy "trade_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'trade-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- Public bucket: reads use public URL; optional policy for authenticated listing
drop policy if exists "trade_images_select_authenticated" on storage.objects;
create policy "trade_images_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'trade-images');
