begin;
create table public.tbm_sessions (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, site_id uuid not null, risk_id uuid,
 started_at timestamp without time zone not null, duration_minutes integer not null check(duration_minutes between 1 and 480),
 location text not null check(length(trim(location)) between 1 and 150),
 work_description text not null check(length(trim(work_description)) between 1 and 2000),
 hazard text not null check(length(trim(hazard)) between 1 and 2000),
 instruction text not null check(length(trim(instruction)) between 1 and 2000),
 facilitator_alias text not null check(length(trim(facilitator_alias)) between 1 and 100),
 risk_snapshot jsonb,
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 foreign key(company_id,site_id) references public.sites(company_id,id),
 foreign key(company_id,site_id,risk_id) references public.work_risks(company_id,site_id,id)
);
create index on public.tbm_sessions(company_id,site_id);
alter table public.tbm_sessions enable row level security;
revoke all on public.tbm_sessions from public,anon,authenticated;
grant select on public.tbm_sessions to authenticated;
grant insert(company_id,site_id,risk_id,started_at,duration_minutes,location,work_description,hazard,instruction,facilitator_alias) on public.tbm_sessions to authenticated;
create policy tbm_read on public.tbm_sessions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy tbm_insert on public.tbm_sessions for insert to authenticated with check(
 private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid())
 and exists(select 1 from public.sites s where s.company_id=tbm_sessions.company_id and s.id=tbm_sessions.site_id and s.active)
);
create function private.capture_tbm_risk() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.risk_id is not null then
  select to_jsonb(r) into new.risk_snapshot from public.work_risks r where r.company_id=new.company_id and r.site_id=new.site_id and r.id=new.risk_id;
  if new.risk_snapshot is null then raise exception 'RISK_ACCESS_DENIED'; end if;
 end if;
 return new;
end $$;
revoke all on function private.capture_tbm_risk() from public,anon,authenticated;
create trigger capture_tbm_risk before insert on public.tbm_sessions for each row execute function private.capture_tbm_risk();
insert into private.local_schema_versions values('tbm-v1');
commit;
