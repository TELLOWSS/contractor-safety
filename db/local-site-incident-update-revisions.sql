begin;
alter table public.site_incident_updates add constraint incident_update_scope unique(company_id,site_id,incident_id,id);
create table public.site_incident_update_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,incident_id uuid not null,update_id uuid not null,
 revision integer not null check(revision>0),
 kind text not null check(kind in ('상황 확인','후속 조치','재발방지 검토','기타')),
 noted_on date not null,detail text not null check(length(trim(detail)) between 1 and 2000),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,incident_id,update_id,revision),
 foreign key(company_id,site_id,incident_id,update_id) references public.site_incident_updates(company_id,site_id,incident_id,id)
);
alter table public.site_incident_update_revisions enable row level security;
revoke all on public.site_incident_update_revisions from public,anon,authenticated;
grant select on public.site_incident_update_revisions to authenticated;
grant insert(company_id,site_id,incident_id,update_id,revision,kind,noted_on,detail,reason) on public.site_incident_update_revisions to authenticated;
create policy incident_update_revisions_read on public.site_incident_update_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy incident_update_revisions_write on public.site_incident_update_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_incident_update_revisions.company_id and s.id=site_incident_update_revisions.site_id and s.active) and exists(select 1 from public.site_incident_updates u where u.company_id=site_incident_update_revisions.company_id and u.site_id=site_incident_update_revisions.site_id and u.incident_id=site_incident_update_revisions.incident_id and u.id=site_incident_update_revisions.update_id));
create function private.guard_incident_update_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.site_incident_update_revisions where company_id=new.company_id and site_id=new.site_id and incident_id=new.incident_id and update_id=new.update_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_incident_update_revision() from public,anon,authenticated;
create trigger guard_incident_update_revision before insert on public.site_incident_update_revisions for each row execute function private.guard_incident_update_revision();
insert into private.local_schema_versions values('site-incident-update-revisions-v1');
commit;
