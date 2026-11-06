begin;
alter table public.work_risks add constraint risk_company_site_id unique(company_id,site_id,id);
create table public.risk_observations (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, site_id uuid not null, risk_id uuid not null,
 kind text not null check(kind in ('의견 전달','현장 확인','조치 후 재확인')),
 observed_on date not null,
 participant_alias text not null check(length(trim(participant_alias)) between 1 and 100),
 detail text not null check(length(trim(detail)) between 1 and 2000),
 evidence_note text not null check(length(trim(evidence_note)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 foreign key(company_id,site_id,risk_id) references public.work_risks(company_id,site_id,id)
);
create index on public.risk_observations(company_id,site_id,risk_id);
alter table public.risk_observations enable row level security;
revoke all on public.risk_observations from public,anon,authenticated;
grant select on public.risk_observations to authenticated;
grant insert(company_id,site_id,risk_id,kind,observed_on,participant_alias,detail,evidence_note) on public.risk_observations to authenticated;
create policy risk_observations_read on public.risk_observations for select to authenticated using(private.can_read_site(company_id,site_id));
create policy risk_observations_insert on public.risk_observations for insert to authenticated with check(
 private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid())
 and exists(select 1 from public.sites s where s.company_id=risk_observations.company_id and s.id=risk_observations.site_id and s.active)
 and exists(select 1 from public.work_risks r where r.company_id=risk_observations.company_id and r.site_id=risk_observations.site_id and r.id=risk_observations.risk_id)
);
insert into private.local_schema_versions values('risk-observations-v1');
commit;
