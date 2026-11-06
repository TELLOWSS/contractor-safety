begin;
create table public.site_action_photos (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,action_id uuid not null,
 action_revision integer not null check(action_revision>0),phase text not null check(phase in ('미구분','작업 전','조치 후','기타')),
 filename text not null check(length(trim(filename)) between 1 and 200),
 byte_size integer not null check(byte_size between 1 and 2097152),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),content bytea not null,
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 check(octet_length(content)=byte_size),foreign key(company_id,site_id,action_id) references public.safety_actions(company_id,site_id,id)
);
create index on public.site_action_photos(company_id,site_id,action_id);
alter table public.site_action_photos enable row level security;
revoke all on public.site_action_photos from public,anon,authenticated;
grant select on public.site_action_photos to authenticated;
grant insert(company_id,site_id,action_id,action_revision,phase,filename,byte_size,sha256,content) on public.site_action_photos to authenticated;
create policy action_photos_read on public.site_action_photos for select to authenticated using(private.can_read_site(company_id,site_id));
create policy action_photos_write on public.site_action_photos for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_action_photos.company_id and s.id=site_action_photos.site_id and s.active) and exists(select 1 from public.safety_actions a where a.company_id=site_action_photos.company_id and a.site_id=site_action_photos.site_id and a.id=site_action_photos.action_id and a.status<>'verified' and a.revision=site_action_photos.action_revision));
insert into private.local_schema_versions values('site-action-photos-v1');
commit;
