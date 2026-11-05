begin;
create table public.obligation_resources (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 obligation_id uuid not null,
 kind text not null check(kind in ('organization','personnel','budget')),
 name text not null check(length(trim(name)) between 1 and 150),
 responsible text not null check(length(trim(responsible)) between 1 and 100),
 description text not null check(length(trim(description)) between 1 and 2000),
 amount bigint check(amount between 0 and 1000000000000),
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 check((kind='budget' and amount is not null) or (kind<>'budget' and amount is null)),
 foreign key(company_id,obligation_id) references public.obligations(company_id,id)
);
create index on obligation_resources(company_id,obligation_id);
alter table obligation_resources enable row level security;
revoke all on obligation_resources from anon,authenticated;
grant select on obligation_resources to authenticated;
grant insert(company_id,obligation_id,kind,name,responsible,description,amount) on obligation_resources to authenticated;
create policy owner_read_resources on obligation_resources for select to authenticated using(private.company_role(company_id)='owner');
create policy owner_create_resources on obligation_resources for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()));
insert into private.local_schema_versions(version) values('resources-v1');
commit;
