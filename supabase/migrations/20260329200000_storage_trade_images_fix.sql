-- Fix uploads: some clients send image/pjpeg or image/jpg; policies use split_part for reliable uid folder match.
update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif']::text[]
where id = 'trade-images';

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
