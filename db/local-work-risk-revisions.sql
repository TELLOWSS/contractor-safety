begin;
create table public.work_risk_revisions (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, site_id uuid not null, risk_id uuid not null,
 revision integer not null check(revision>0),
 work_type text not null check(work_type in ('거푸집·동바리','갱폼·AL폼','철근','콘크리트 타설','개구부·단부','양중·장비','기타')),
 location text not null check(length(trim(location)) between 1 and 150), work_date date not null,
 hazard text not null check(length(trim(hazard)) between 1 and 2000), measure text not null check(length(trim(measure)) between 1 and 2000),
 reason text not null check(length(trim(reason)) between 1 and 1000), recorded_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now(),
 unique(company_id,site_id,risk_id,revision), foreign key(company_id,site_id,risk_id) references public.work_risks(company_id,site_id,id)
);
alter table public.work_risk_revisions enable row level security;
revoke all on public.work_risk_revisions from public,anon,authenticated;
grant select on public.work_risk_revisions to authenticated;
grant insert(company_id,site_id,risk_id,revision,work_type,location,work_date,hazard,measure,reason) on public.work_risk_revisions to authenticated;
create policy work_risk_revisions_read on public.work_risk_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy work_risk_revisions_insert on public.work_risk_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=work_risk_revisions.company_id and s.id=work_risk_revisions.site_id and s.active) and exists(select 1 from public.work_risks r where r.company_id=work_risk_revisions.company_id and r.site_id=work_risk_revisions.site_id and r.id=work_risk_revisions.risk_id));
create function private.guard_work_risk_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.work_risk_revisions where company_id=new.company_id and site_id=new.site_id and risk_id=new.risk_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_work_risk_revision() from public,anon,authenticated;
create trigger guard_work_risk_revision before insert on public.work_risk_revisions for each row execute function private.guard_work_risk_revision();
create or replace function private.capture_tbm_risk() returns trigger language plpgsql security invoker set search_path='' as $$
declare updated jsonb;
begin
 if new.risk_id is not null then
  select to_jsonb(r)||jsonb_build_object('revision',0) into new.risk_snapshot from public.work_risks r where r.company_id=new.company_id and r.site_id=new.site_id and r.id=new.risk_id;
  if new.risk_snapshot is null then raise exception 'RISK_ACCESS_DENIED'; end if;
  select jsonb_build_object('work_type',r.work_type,'location',r.location,'work_date',r.work_date,'hazard',r.hazard,'measure',r.measure,'revision',r.revision) into updated from public.work_risk_revisions r where r.company_id=new.company_id and r.site_id=new.site_id and r.risk_id=new.risk_id order by r.revision desc limit 1;
  if updated is not null then new.risk_snapshot:=new.risk_snapshot||updated; end if;
 end if;
 return new;
end $$;
insert into private.local_schema_versions values('work-risk-revisions-v1');
commit;
