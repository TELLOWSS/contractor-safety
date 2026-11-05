begin;
alter table public.safety_actions add constraint action_company_site_id unique(company_id,site_id,id);
create table public.work_risks (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, site_id uuid not null,
 action_id uuid,
 work_type text not null check(work_type in ('거푸집·동바리','갱폼·AL폼','철근','콘크리트 타설','개구부·단부','양중·장비','기타')),
 location text not null check(length(trim(location)) between 1 and 150),
 work_date date not null,
 hazard text not null check(length(trim(hazard)) between 1 and 2000),
 measure text not null check(length(trim(measure)) between 1 and 2000),
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 foreign key(company_id,site_id) references public.sites(company_id,id),
 foreign key(company_id,site_id,action_id) references public.safety_actions(company_id,site_id,id)
);
create index on work_risks(company_id,site_id);
alter table work_risks enable row level security;
revoke all on work_risks from public,anon,authenticated;
grant select on work_risks to authenticated;
grant insert(company_id,site_id,action_id,work_type,location,work_date,hazard,measure) on work_risks to authenticated;
create policy risks_read on work_risks for select to authenticated using(private.can_read_site(company_id,site_id));
create policy risks_insert on work_risks for insert to authenticated with check(
 private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid())
 and exists(select 1 from public.sites s where s.company_id=work_risks.company_id and s.id=work_risks.site_id and s.active)
 and (action_id is null or exists(select 1 from public.safety_actions a where a.company_id=work_risks.company_id and a.site_id=work_risks.site_id and a.id=work_risks.action_id))
);
insert into private.local_schema_versions values('work-risks-v1');
commit;
