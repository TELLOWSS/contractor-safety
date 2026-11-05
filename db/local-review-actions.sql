begin;
alter table public.halfyear_reviews add constraint review_company_id unique(company_id,id);
alter table public.safety_actions add constraint action_company_id unique(company_id,id);
create table public.review_actions (
 company_id uuid not null, review_id uuid not null, action_id uuid not null,
 note text not null check(length(trim(note)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 primary key(company_id,review_id,action_id),
 foreign key(company_id,review_id) references public.halfyear_reviews(company_id,id),
 foreign key(company_id,action_id) references public.safety_actions(company_id,id)
);
alter table review_actions enable row level security;
revoke all on review_actions from public,anon,authenticated;
grant select on review_actions to authenticated;
grant insert(company_id,review_id,action_id,note) on review_actions to authenticated;
create policy review_action_read on review_actions for select to authenticated using(private.company_role(company_id)='owner');
create policy review_action_insert on review_actions for insert to authenticated with check(
 private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(
  select 1 from public.halfyear_reviews r join public.safety_actions a on a.company_id=r.company_id and a.obligation_id=r.obligation_id
  where r.company_id=review_actions.company_id and r.id=review_actions.review_id and a.id=review_actions.action_id
 ));
insert into private.local_schema_versions values('review-actions-v1');
commit;
