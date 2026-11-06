begin;
alter table public.risk_observations add constraint risk_observation_scope_id unique(company_id,site_id,risk_id,id);
create table public.risk_observation_revisions (
 id uuid primary key default gen_random_uuid(), company_id uuid not null,site_id uuid not null,risk_id uuid not null,observation_id uuid not null,
 revision integer not null check(revision>0),kind text not null check(kind in ('의견 전달','현장 확인','조치 후 재확인')),
 observed_on date not null, participant_alias text not null check(length(trim(participant_alias)) between 1 and 100),
 detail text not null check(length(trim(detail)) between 1 and 2000), evidence_note text not null check(length(trim(evidence_note)) between 1 and 1000),
 reason text not null check(length(trim(reason)) between 1 and 1000), recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,risk_id,observation_id,revision),
 foreign key(company_id,site_id,risk_id,observation_id) references public.risk_observations(company_id,site_id,risk_id,id)
);
alter table public.risk_observation_revisions enable row level security;
revoke all on public.risk_observation_revisions from public,anon,authenticated;
grant select on public.risk_observation_revisions to authenticated;
grant insert(company_id,site_id,risk_id,observation_id,revision,kind,observed_on,participant_alias,detail,evidence_note,reason) on public.risk_observation_revisions to authenticated;
create policy risk_observation_revisions_read on public.risk_observation_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy risk_observation_revisions_write on public.risk_observation_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=risk_observation_revisions.company_id and s.id=risk_observation_revisions.site_id and s.active) and exists(select 1 from public.risk_observations o where o.company_id=risk_observation_revisions.company_id and o.site_id=risk_observation_revisions.site_id and o.risk_id=risk_observation_revisions.risk_id and o.id=risk_observation_revisions.observation_id));
create function private.guard_risk_observation_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.risk_observation_revisions where company_id=new.company_id and site_id=new.site_id and risk_id=new.risk_id and observation_id=new.observation_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_risk_observation_revision() from public,anon,authenticated;
create trigger guard_risk_observation_revision before insert on public.risk_observation_revisions for each row execute function private.guard_risk_observation_revision();
insert into private.local_schema_versions values('risk-observation-revisions-v1');
commit;
