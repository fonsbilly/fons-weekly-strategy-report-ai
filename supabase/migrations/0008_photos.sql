-- Photo attachments for weekly submissions. Files live in a private Storage bucket;
-- this table tracks their paths/metadata. Same privacy as report content: a director
-- sees only their own, the RVP sees all.

create table submission_photos (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references profiles(id) on delete cascade,
  branch branch_name not null,
  week_start date not null,
  storage_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index submission_photos_week_idx on submission_photos(week_start);
create index submission_photos_director_idx on submission_photos(director_id);

alter table submission_photos enable row level security;

create policy "sp_select_owner_or_rvp" on submission_photos for select
  using (director_id = auth.uid() or is_rvp());
create policy "sp_insert_own" on submission_photos for insert
  with check (director_id = auth.uid());
create policy "sp_delete_owner_or_rvp" on submission_photos for delete
  using (director_id = auth.uid() or is_rvp());

-- Private Storage bucket (10 MB/image cap, common phone/image types incl. HEIC).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-photos', 'submission-photos', false, 10485760,
  array['image/png','image/jpeg','image/jpg','image/webp','image/heic','image/heif','image/gif']
)
on conflict (id) do nothing;

-- Storage object policies. Path convention: {director_id}/{week_start}/{file}
create policy "photos_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submission-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_select_own_or_rvp" on storage.objects for select to authenticated
  using (
    bucket_id = 'submission-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_rvp())
  );
create policy "photos_delete_own_or_rvp" on storage.objects for delete to authenticated
  using (
    bucket_id = 'submission-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_rvp())
  );
