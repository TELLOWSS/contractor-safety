begin;
create table public.site_work_permits (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,prime_id uuid,
 work_on date not null,work_name text not null check(length(trim(work_name)) between 1 and 150),
 location text not null check(length(trim(location)) between 1 and 150),
 permit_need text not null check(permit_need in ('확인 전','필요로 확인','불필요로 확인')),
 managing_party text not null check(managing_party in ('확인 전','원도급사','협력사','공동','기타')),
 conditions text not null default '' check(length(conditions)<=2000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,id),foreign key(company_id,site_id) references public.sites(company_id,id),
 foreign key(company_id,site_id,prime_id) references public.site_primes(company_id,site_id,id)
);
create table public.site_work_permit_notes (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,work_permit_id uuid not null,
 kind text not null check(kind in ('허가 확인 메모','안전시설 확인 메모','작업 변경 메모','작업 중지 메모','작업 종료 메모','기타')),
 noted_on date not null,detail text not null check(length(trim(detail)) between 1 and 2000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 foreign key(company_id,site_id,work_permit_id) references public.site_work_permits(company_id,site_id,id)
);
create index on public.site_work_permits(company_id,site_id);
create index on public.site_work_permit_notes(company_id,site_id,work_permit_id);
alter table public.site_work_permits enable row level security;
alter table public.site_work_permit_notes enable row level security;
revoke all on public.site_work_permits,public.site_work_permit_notes from public,anon,authenticated;
grant select on public.site_work_permits,public.site_work_permit_notes to authenticated;
grant insert(company_id,site_id,prime_id,work_on,work_name,location,permit_need,managing_party,conditions) on public.site_work_permits to authenticated;
grant insert(company_id,site_id,work_permit_id,kind,noted_on,detail) on public.site_work_permit_notes to authenticated;
create policy work_permits_read on public.site_work_permits for select to authenticated using(private.can_read_site(company_id,site_id));
create policy work_permits_write on public.site_work_permits for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_work_permits.company_id and s.id=site_work_permits.site_id and s.active));
create policy permit_notes_read on public.site_work_permit_notes for select to authenticated using(private.can_read_site(company_id,site_id));
create policy permit_notes_write on public.site_work_permit_notes for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_work_permit_notes.company_id and s.id=site_work_permit_notes.site_id and s.active) and exists(select 1 from public.site_work_permits p where p.company_id=site_work_permit_notes.company_id and p.site_id=site_work_permit_notes.site_id and p.id=site_work_permit_notes.work_permit_id));
insert into private.local_schema_versions values('site-work-permits-v1');
commit;
