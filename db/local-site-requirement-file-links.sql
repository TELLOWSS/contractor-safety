begin;
alter table public.site_requirement_files add constraint requirement_file_scope unique(company_id,site_id,requirement_id,id);
create table public.site_requirement_file_links (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,requirement_id uuid not null,file_id uuid not null,
 requirement_revision integer not null check(requirement_revision>0),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 foreign key(company_id,site_id,requirement_id,file_id) references public.site_requirement_files(company_id,site_id,requirement_id,id),
 unique(company_id,site_id,requirement_id,file_id,requirement_revision)
);
alter table public.site_requirement_file_links enable row level security;
revoke all on public.site_requirement_file_links from public,anon,authenticated;
grant select on public.site_requirement_file_links to authenticated;
grant insert(company_id,site_id,requirement_id,file_id,requirement_revision,reason) on public.site_requirement_file_links to authenticated;
create policy requirement_file_links_read on public.site_requirement_file_links for select to authenticated using(private.can_read_site(company_id,site_id));
create policy requirement_file_links_write on public.site_requirement_file_links for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_requirement_file_links.company_id and s.id=site_requirement_file_links.site_id and s.active) and exists(select 1 from public.site_requirement_files f where f.company_id=site_requirement_file_links.company_id and f.site_id=site_requirement_file_links.site_id and f.requirement_id=site_requirement_file_links.requirement_id and f.id=site_requirement_file_links.file_id and f.requirement_revision<site_requirement_file_links.requirement_revision));
create function private.guard_requirement_file_link() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.site_requirement_revisions where company_id=new.company_id and site_id=new.site_id and requirement_id=new.requirement_id;
 if new.requirement_revision<>latest then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_requirement_file_link() from public,anon,authenticated;
create trigger guard_requirement_file_link before insert on public.site_requirement_file_links for each row execute function private.guard_requirement_file_link();
insert into private.local_schema_versions values('site-requirement-file-links-v1');
commit;
