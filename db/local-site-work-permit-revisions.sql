begin;
create table public.site_work_permit_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,work_permit_id uuid not null,
 revision integer not null check(revision>0),prime_id uuid,
 work_on date not null,work_name text not null check(length(trim(work_name)) between 1 and 150),
 location text not null check(length(trim(location)) between 1 and 150),
 permit_need text not null check(permit_need in ('확인 전','필요로 확인','불필요로 확인')),
 managing_party text not null check(managing_party in ('확인 전','원도급사','협력사','공동','기타')),
 conditions text not null default '' check(length(conditions)<=2000),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,work_permit_id,revision),
 foreign key(company_id,site_id,work_permit_id) references public.site_work_permits(company_id,site_id,id),
 foreign key(company_id,site_id,prime_id) references public.site_primes(company_id,site_id,id)
);
alter table public.site_work_permit_revisions enable row level security;
revoke all on public.site_work_permit_revisions from public,anon,authenticated;
grant select on public.site_work_permit_revisions to authenticated;
grant insert(company_id,site_id,work_permit_id,revision,prime_id,work_on,work_name,location,permit_need,managing_party,conditions,reason) on public.site_work_permit_revisions to authenticated;
create policy permit_revisions_read on public.site_work_permit_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy permit_revisions_write on public.site_work_permit_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_work_permit_revisions.company_id and s.id=site_work_permit_revisions.site_id and s.active) and exists(select 1 from public.site_work_permits p where p.company_id=site_work_permit_revisions.company_id and p.site_id=site_work_permit_revisions.site_id and p.id=site_work_permit_revisions.work_permit_id));
create function private.guard_permit_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.site_work_permit_revisions where company_id=new.company_id and site_id=new.site_id and work_permit_id=new.work_permit_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_permit_revision() from public,anon,authenticated;
create trigger guard_permit_revision before insert on public.site_work_permit_revisions for each row execute function private.guard_permit_revision();
insert into private.local_schema_versions values('site-work-permit-revisions-v1');
commit;
