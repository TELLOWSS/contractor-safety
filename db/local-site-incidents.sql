begin;
create table public.site_incidents (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,action_id uuid,
 kind text not null check(kind in ('사고','아차사고','확인 필요')),
 occurred_on date not null, location text not null check(length(trim(location)) between 1 and 150),
 description text not null check(length(trim(description)) between 1 and 2000),
 immediate_action text not null default '' check(length(immediate_action)<=2000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,id), foreign key(company_id,site_id) references public.sites(company_id,id),
 foreign key(company_id,site_id,action_id) references public.safety_actions(company_id,site_id,id)
);
create table public.site_incident_updates (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,incident_id uuid not null,
 kind text not null check(kind in ('상황 확인','후속 조치','재발방지 검토','기타')),
 noted_on date not null,detail text not null check(length(trim(detail)) between 1 and 2000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 foreign key(company_id,site_id,incident_id) references public.site_incidents(company_id,site_id,id)
);
create index on public.site_incidents(company_id,site_id);
create index on public.site_incident_updates(company_id,site_id,incident_id);
alter table public.site_incidents enable row level security;
alter table public.site_incident_updates enable row level security;
revoke all on public.site_incidents,public.site_incident_updates from public,anon,authenticated;
grant select on public.site_incidents,public.site_incident_updates to authenticated;
grant insert(company_id,site_id,action_id,kind,occurred_on,location,description,immediate_action) on public.site_incidents to authenticated;
grant insert(company_id,site_id,incident_id,kind,noted_on,detail) on public.site_incident_updates to authenticated;
create policy incidents_read on public.site_incidents for select to authenticated using(private.can_read_site(company_id,site_id));
create policy incidents_write on public.site_incidents for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_incidents.company_id and s.id=site_incidents.site_id and s.active) and (action_id is null or exists(select 1 from public.safety_actions a where a.company_id=site_incidents.company_id and a.site_id=site_incidents.site_id and a.id=site_incidents.action_id)));
create policy incident_updates_read on public.site_incident_updates for select to authenticated using(private.can_read_site(company_id,site_id));
create policy incident_updates_write on public.site_incident_updates for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_incident_updates.company_id and s.id=site_incident_updates.site_id and s.active) and exists(select 1 from public.site_incidents i where i.company_id=site_incident_updates.company_id and i.site_id=site_incident_updates.site_id and i.id=site_incident_updates.incident_id));
insert into private.local_schema_versions values('site-incidents-v1');
commit;
