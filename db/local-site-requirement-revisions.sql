begin;
alter table public.site_requirements add constraint site_requirement_scope unique(company_id,site_id,id);
create table public.site_requirement_revisions (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, site_id uuid not null, requirement_id uuid not null,
 revision integer not null check(revision>0), prime_id uuid,
 kind text not null check(kind in ('요구사항','양식')),
 title text not null check(length(trim(title)) between 1 and 150),
 source_kind text not null check(source_kind in ('확인 전','원도급사 공통','현장 지시','협력사 자체')),
 confirmation text not null check(confirmation in ('확인 전','검토 중','확인됨')),
 detail text not null check(length(trim(detail)) between 1 and 2000),
 version_label text not null default '' check(length(version_label)<=150),
 location_note text not null default '' check(length(location_note)<=500),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now(),
 unique(company_id,site_id,requirement_id,revision),
 foreign key(company_id,site_id,requirement_id) references public.site_requirements(company_id,site_id,id),
 foreign key(company_id,site_id,prime_id) references public.site_primes(company_id,site_id,id)
);
alter table public.site_requirement_revisions enable row level security;
revoke all on public.site_requirement_revisions from public,anon,authenticated;
grant select on public.site_requirement_revisions to authenticated;
grant insert(company_id,site_id,requirement_id,revision,prime_id,kind,title,source_kind,confirmation,detail,version_label,location_note,reason) on public.site_requirement_revisions to authenticated;
create policy requirement_revisions_read on public.site_requirement_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy requirement_revisions_insert on public.site_requirement_revisions for insert to authenticated with check(
 private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid())
 and exists(select 1 from public.sites s where s.company_id=site_requirement_revisions.company_id and s.id=site_requirement_revisions.site_id and s.active)
 and exists(select 1 from public.site_requirements r where r.company_id=site_requirement_revisions.company_id and r.site_id=site_requirement_revisions.site_id and r.id=site_requirement_revisions.requirement_id)
);
create function private.guard_requirement_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.site_requirement_revisions where company_id=new.company_id and site_id=new.site_id and requirement_id=new.requirement_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_requirement_revision() from public,anon,authenticated;
create trigger guard_requirement_revision before insert on public.site_requirement_revisions for each row execute function private.guard_requirement_revision();
insert into private.local_schema_versions values('site-requirement-revisions-v1');
commit;
