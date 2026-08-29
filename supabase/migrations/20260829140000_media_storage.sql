-- Private media bucket. Objects use one of these keys:
--   org/<org_uuid>/property/<property_uuid>/<object>
--   org/<org_uuid>/_org/<object> (global org roles only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy media_read on storage.objects for select to authenticated using (
  bucket_id = 'media'
  and split_part(name, '/', 1) = 'org'
  and public.is_active_org_member(split_part(name, '/', 2)::uuid)
  and (
    (split_part(name, '/', 3) = '_org'
      and public.has_global_org_role(split_part(name, '/', 2)::uuid))
    or (split_part(name, '/', 3) = 'property'
      and public.can_access_property(
        split_part(name, '/', 2)::uuid,
        split_part(name, '/', 4)::uuid
      ))
  )
);

create policy media_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'media'
  and split_part(name, '/', 1) = 'org'
  and public.is_active_org_member(split_part(name, '/', 2)::uuid)
  and (
    (split_part(name, '/', 3) = '_org'
      and public.has_global_org_role(split_part(name, '/', 2)::uuid))
    or (split_part(name, '/', 3) = 'property'
      and public.can_access_property(
        split_part(name, '/', 2)::uuid,
        split_part(name, '/', 4)::uuid
      ))
  )
);

create policy media_update on storage.objects for update to authenticated using (
  bucket_id = 'media'
  and owner_id = public.current_user_id()::text
  and public.is_active_org_member(split_part(name, '/', 2)::uuid)
) with check (
  bucket_id = 'media'
  and owner_id = public.current_user_id()::text
  and public.is_active_org_member(split_part(name, '/', 2)::uuid)
);

create policy media_delete on storage.objects for delete to authenticated using (
  bucket_id = 'media'
  and owner_id = public.current_user_id()::text
  and public.is_active_org_member(split_part(name, '/', 2)::uuid)
);
