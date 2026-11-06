begin;
alter table public.tbm_sessions add constraint tbm_scope_id unique(company_id,site_id,id);
create table public.tbm_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,tbm_id uuid not null,
 revision integer not null check(revision>0),started_at timestamp without time zone not null,duration_minutes integer not null check(duration_minutes between 1 and 480),
 location text not null check(length(trim(location)) between 1 and 150),work_description text not null check(length(trim(work_description)) between 1 and 2000),
 hazard text not null check(length(trim(hazard)) between 1 and 2000),instruction text not null check(length(trim(instruction)) between 1 and 2000),
 facilitator_alias text not null check(length(trim(facilitator_alias)) between 1 and 100),
 attendance_scope text check(attendance_scope in ('원청 관리','협력사 관리','공동 관리','확인 필요','기타')),
 education_label text check(education_label is null or length(trim(education_label)) between 1 and 150),scope_note text check(scope_note is null or length(trim(scope_note)) between 1 and 1000),
 reason text not null check(length(trim(reason)) between 1 and 1000),recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,tbm_id,revision),foreign key(company_id,site_id,tbm_id) references public.tbm_sessions(company_id,site_id,id)
);
alter table public.tbm_revisions enable row level security;
revoke all on public.tbm_revisions from public,anon,authenticated;
grant select on public.tbm_revisions to authenticated;
grant insert(company_id,site_id,tbm_id,revision,started_at,duration_minutes,location,work_description,hazard,instruction,facilitator_alias,attendance_scope,education_label,scope_note,reason) on public.tbm_revisions to authenticated;
create policy tbm_revisions_read on public.tbm_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy tbm_revisions_insert on public.tbm_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=tbm_revisions.company_id and s.id=tbm_revisions.site_id and s.active) and exists(select 1 from public.tbm_sessions t where t.company_id=tbm_revisions.company_id and t.site_id=tbm_revisions.site_id and t.id=tbm_revisions.tbm_id));
create function private.guard_tbm_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.tbm_revisions where company_id=new.company_id and site_id=new.site_id and tbm_id=new.tbm_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_tbm_revision() from public,anon,authenticated;
create trigger guard_tbm_revision before insert on public.tbm_revisions for each row execute function private.guard_tbm_revision();
insert into private.local_schema_versions values('tbm-revisions-v1');
commit;
