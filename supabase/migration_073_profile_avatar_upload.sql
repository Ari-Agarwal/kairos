-- Craft & delight (Software_Timeline.md Section 1): student's own photo
-- upload on the Profile page. Distinct from and separate from the
-- accent-color preference work (migration 067). No storage.from(...) usage
-- existed anywhere in the repo, so this scopes a single new bucket rather
-- than reusing a pre-existing pattern.
--
-- Bucket layout: one object per student at "<user_id>/<filename>", so RLS
-- can key off the leading path segment matching auth.uid() the same way the
-- rest of the schema keys row ownership off user_id. Public read (bucket is
-- public) so the avatar can render without a signed URL; write/delete is
-- restricted to the owning student.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "Students can upload their own profile photo"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Students can update their own profile photo"
  on storage.objects for update
  using (
    bucket_id = 'profile-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Students can delete their own profile photo"
  on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

alter table profiles
  add column avatar_url text;
