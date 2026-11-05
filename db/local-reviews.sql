begin;
create table public.halfyear_reviews (
 id uuid primary key default gen_random_uuid(), company_id uuid not null,
 obligation_id uuid not null, period_start date not null, period_end date not null,
 result text not null check(result in ('미확인','확인 필요','개선 필요','확인 기록')),
 findings text not null check(length(trim(findings)) between 1 and 2000),
 evidence_note text not null check(length(trim(evidence_note)) between 1 and 2000),
 followup text not null check(length(trim(followup)) between 1 and 2000),
 obligation_snapshot jsonb not null default '{}',
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 check(period_end>=period_start),
 foreign key(company_id,obligation_id) references public.obligations(company_id,id)
);
alter table halfyear_reviews enable row level security;
revoke all on halfyear_reviews from public,anon,authenticated;
grant select on halfyear_reviews to authenticated;
grant insert(company_id,obligation_id,period_start,period_end,result,findings,evidence_note,followup) on halfyear_reviews to authenticated;
create policy review_read on halfyear_reviews for select to authenticated using(private.company_role(company_id)='owner');
create policy review_insert on halfyear_reviews for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()));
create function private.capture_review_obligation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select to_jsonb(o)-'events' into new.obligation_snapshot from public.obligations o where o.company_id=new.company_id and o.id=new.obligation_id;
 if new.obligation_snapshot is null then raise exception 'OBLIGATION_ACCESS_DENIED'; end if;
 return new;
end $$;
revoke all on function private.capture_review_obligation() from public,anon,authenticated;
create trigger capture_review_obligation before insert on halfyear_reviews for each row execute function private.capture_review_obligation();
insert into private.local_schema_versions values('reviews-v1');
commit;
