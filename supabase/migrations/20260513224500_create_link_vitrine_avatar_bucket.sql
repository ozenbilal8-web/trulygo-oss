insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'link-vitrine-avatars',
  'link-vitrine-avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists link_vitrine_avatars_public_read on storage.objects;

create policy link_vitrine_avatars_public_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'link-vitrine-avatars');

drop policy if exists link_vitrine_avatars_insert_own_vitrine on storage.objects;

create policy link_vitrine_avatars_insert_own_vitrine
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'link-vitrine-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~* '^avatar\.(png|jpg|jpeg|webp)$'
  and exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id::text = (storage.foldername(name))[2]
      and link_vitrines.user_id = (select auth.uid())
  )
);

drop policy if exists link_vitrine_avatars_update_own_vitrine on storage.objects;

create policy link_vitrine_avatars_update_own_vitrine
on storage.objects
for update
to authenticated
using (
  bucket_id = 'link-vitrine-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id::text = (storage.foldername(name))[2]
      and link_vitrines.user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'link-vitrine-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and storage.filename(name) ~* '^avatar\.(png|jpg|jpeg|webp)$'
  and exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id::text = (storage.foldername(name))[2]
      and link_vitrines.user_id = (select auth.uid())
  )
);

drop policy if exists link_vitrine_avatars_delete_own_vitrine on storage.objects;

create policy link_vitrine_avatars_delete_own_vitrine
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'link-vitrine-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id::text = (storage.foldername(name))[2]
      and link_vitrines.user_id = (select auth.uid())
  )
);
