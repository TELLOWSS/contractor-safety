begin;
alter table public.site_action_photos add column client_upload_id uuid;
create unique index site_action_photos_upload_once on public.site_action_photos(company_id,client_upload_id) where client_upload_id is not null;
grant insert(client_upload_id) on public.site_action_photos to authenticated;
insert into private.local_schema_versions values('action-photo-upload-id-v1');
commit;
