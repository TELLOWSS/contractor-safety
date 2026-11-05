begin;
alter table public.obligation_resources add constraint resource_company_unique unique(company_id,id);
create table public.budget_expenses (
 id uuid primary key default gen_random_uuid(), company_id uuid not null,
 resource_id uuid not null, spent_on date not null,
 amount bigint not null check(amount between 1 and 1000000000000),
 description text not null check(length(trim(description)) between 1 and 1000),
 evidence_note text not null check(length(trim(evidence_note)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 foreign key(company_id,resource_id) references public.obligation_resources(company_id,id)
);
alter table budget_expenses enable row level security;
revoke all on budget_expenses from public,anon,authenticated;
grant select on budget_expenses to authenticated;
grant insert(company_id,resource_id,spent_on,amount,description,evidence_note) on budget_expenses to authenticated;
create policy expense_read on budget_expenses for select to authenticated using(private.company_role(company_id)='owner');
create policy expense_insert on budget_expenses for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(select 1 from public.obligation_resources r where r.company_id=budget_expenses.company_id and r.id=budget_expenses.resource_id and r.kind='budget'));
insert into private.local_schema_versions values('expenses-v1');
commit;
