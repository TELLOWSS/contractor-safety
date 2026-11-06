begin;
alter table public.site_ppe_issues add constraint site_ppe_scope unique(company_id,site_id,id);
create table public.site_ppe_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,issue_id uuid not null,
 revision integer not null check(revision>0),issued_on date not null,
 item_name text not null check(length(trim(item_name)) between 1 and 150),
 quantity integer not null check(quantity between 1 and 1000000),unit text not null check(length(trim(unit)) between 1 and 20),
 recipient_note text not null default '' check(length(recipient_note)<=150),note text not null default '' check(length(note)<=1000),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,issue_id,revision),foreign key(company_id,site_id,issue_id) references public.site_ppe_issues(company_id,site_id,id)
);
alter table public.site_ppe_revisions enable row level security;
revoke all on public.site_ppe_revisions from public,anon,authenticated;
grant select on public.site_ppe_revisions to authenticated;
grant insert(company_id,site_id,issue_id,revision,issued_on,item_name,quantity,unit,recipient_note,note,reason) on public.site_ppe_revisions to authenticated;
create policy ppe_revisions_read on public.site_ppe_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy ppe_revisions_write on public.site_ppe_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_ppe_revisions.company_id and s.id=site_ppe_revisions.site_id and s.active) and exists(select 1 from public.site_ppe_issues p where p.company_id=site_ppe_revisions.company_id and p.site_id=site_ppe_revisions.site_id and p.id=site_ppe_revisions.issue_id));
create function private.guard_ppe_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.site_ppe_revisions where company_id=new.company_id and site_id=new.site_id and issue_id=new.issue_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_ppe_revision() from public,anon,authenticated;
create trigger guard_ppe_revision before insert on public.site_ppe_revisions for each row execute function private.guard_ppe_revision();
insert into private.local_schema_versions values('site-ppe-revisions-v1');
commit;
