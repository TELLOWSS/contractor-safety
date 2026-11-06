begin;
create table public.site_ppe_issues (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,
 issued_on date not null,item_name text not null check(length(trim(item_name)) between 1 and 150),
 quantity integer not null check(quantity between 1 and 1000000),unit text not null check(length(trim(unit)) between 1 and 20),
 recipient_note text not null default '' check(length(recipient_note)<=150),
 note text not null default '' check(length(note)<=1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 foreign key(company_id,site_id) references public.sites(company_id,id)
);
create index on public.site_ppe_issues(company_id,site_id);
alter table public.site_ppe_issues enable row level security;
revoke all on public.site_ppe_issues from public,anon,authenticated;
grant select on public.site_ppe_issues to authenticated;
grant insert(company_id,site_id,issued_on,item_name,quantity,unit,recipient_note,note) on public.site_ppe_issues to authenticated;
create policy ppe_read on public.site_ppe_issues for select to authenticated using(private.can_read_site(company_id,site_id));
create policy ppe_write on public.site_ppe_issues for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_ppe_issues.company_id and s.id=site_ppe_issues.site_id and s.active));
insert into private.local_schema_versions values('site-ppe-v1');
commit;
