begin;
create table public.site_requirements (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, site_id uuid not null, prime_id uuid,
 kind text not null check(kind in ('요구사항','양식')),
 title text not null check(length(trim(title)) between 1 and 150),
 source_kind text not null check(source_kind in ('확인 전','원도급사 공통','현장 지시','협력사 자체')),
 confirmation text not null check(confirmation in ('확인 전','검토 중','확인됨')),
 detail text not null check(length(trim(detail)) between 1 and 2000),
 version_label text not null default '' check(length(version_label)<=150),
 location_note text not null default '' check(length(location_note)<=500),
 recorded_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now(),
 foreign key(company_id,site_id) references public.sites(company_id,id),
 foreign key(company_id,site_id,prime_id) references public.site_primes(company_id,site_id,id)
);
create index on public.site_requirements(company_id,site_id);
alter table public.site_requirements enable row level security;
revoke all on public.site_requirements from public,anon,authenticated;
grant select on public.site_requirements to authenticated;
grant insert(company_id,site_id,prime_id,kind,title,source_kind,confirmation,detail,version_label,location_note) on public.site_requirements to authenticated;
create policy requirements_read on public.site_requirements for select to authenticated using(private.can_read_site(company_id,site_id));
create policy requirements_insert on public.site_requirements for insert to authenticated with check(
 private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid())
 and exists(select 1 from public.sites s where s.company_id=site_requirements.company_id and s.id=site_requirements.site_id and s.active)
);
insert into private.local_schema_versions values('site-requirements-v1');
commit;
