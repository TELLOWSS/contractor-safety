begin;
create table public.review_budgets (
 company_id uuid not null, review_id uuid not null, resource_id uuid not null,
 note text not null check(length(trim(note)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 primary key(company_id,review_id,resource_id),
 foreign key(company_id,review_id) references public.halfyear_reviews(company_id,id),
 foreign key(company_id,resource_id) references public.obligation_resources(company_id,id)
);
alter table review_budgets enable row level security;
revoke all on review_budgets from public,anon,authenticated;
grant select on review_budgets to authenticated;
grant insert(company_id,review_id,resource_id,note) on review_budgets to authenticated;
create policy review_budget_read on review_budgets for select to authenticated using(private.company_role(company_id)='owner');
create policy review_budget_insert on review_budgets for insert to authenticated with check(
 private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(
 select 1 from public.halfyear_reviews r join public.obligation_resources b on b.company_id=r.company_id and b.obligation_id=r.obligation_id
 where r.company_id=review_budgets.company_id and r.id=review_budgets.review_id and b.id=review_budgets.resource_id and b.kind='budget'));
insert into private.local_schema_versions values('review-budgets-v1');
commit;
