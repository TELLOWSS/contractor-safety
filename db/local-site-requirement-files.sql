begin;
create table public.site_requirement_files (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,requirement_id uuid not null,
 requirement_revision integer not null check(requirement_revision>=0),
 filename text not null check(length(trim(filename)) between 1 and 200),
 byte_size integer not null check(byte_size between 1 and 2097152),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), content bytea not null,
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 check(octet_length(content)=byte_size),
 foreign key(company_id,site_id,requirement_id) references public.site_requirements(company_id,site_id,id)
);
create index on public.site_requirement_files(company_id,site_id,requirement_id);
alter table public.site_requirement_files enable row level security;
revoke all on public.site_requirement_files from public,anon,authenticated;
grant select on public.site_requirement_files to authenticated;
grant insert(company_id,site_id,requirement_id,requirement_revision,filename,byte_size,sha256,content) on public.site_requirement_files to authenticated;
create policy requirement_files_read on public.site_requirement_files for select to authenticated using(private.can_read_site(company_id,site_id));
create policy requirement_files_write on public.site_requirement_files for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_requirement_files.company_id and s.id=site_requirement_files.site_id and s.active) and exists(select 1 from public.site_requirements r where r.company_id=site_requirement_files.company_id and r.site_id=site_requirement_files.site_id and r.id=site_requirement_files.requirement_id));
create function private.guard_requirement_file_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.site_requirement_revisions where company_id=new.company_id and site_id=new.site_id and requirement_id=new.requirement_id;
 if new.requirement_revision<>latest then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_requirement_file_revision() from public,anon,authenticated;
create trigger guard_requirement_file_revision before insert on public.site_requirement_files for each row execute function private.guard_requirement_file_revision();
insert into private.local_schema_versions values('site-requirement-files-v1');
commit;
