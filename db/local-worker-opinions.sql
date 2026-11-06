begin;
create table public.worker_safety_opinions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,
 received_on date not null,content text not null check(length(trim(content)) between 1 and 2000),
 source_note text not null default '' check(length(source_note)<=500),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,id),foreign key(company_id,site_id) references public.sites(company_id,id)
);
create table public.worker_opinion_responses (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,opinion_id uuid not null,action_id uuid,
 kind text not null check(kind in ('검토 기록','회신 기록','조치 기록')),
 noted_on date not null,detail text not null check(length(trim(detail)) between 1 and 2000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 foreign key(company_id,site_id,opinion_id) references public.worker_safety_opinions(company_id,site_id,id),
 foreign key(company_id,site_id,action_id) references public.safety_actions(company_id,site_id,id)
);
create index on public.worker_safety_opinions(company_id,site_id);
create index on public.worker_opinion_responses(company_id,site_id,opinion_id);
alter table public.worker_safety_opinions enable row level security;
alter table public.worker_opinion_responses enable row level security;
revoke all on public.worker_safety_opinions,public.worker_opinion_responses from public,anon,authenticated;
grant select on public.worker_safety_opinions,public.worker_opinion_responses to authenticated;
grant insert(company_id,site_id,received_on,content,source_note) on public.worker_safety_opinions to authenticated;
grant insert(company_id,site_id,opinion_id,action_id,kind,noted_on,detail) on public.worker_opinion_responses to authenticated;
create policy worker_opinions_read on public.worker_safety_opinions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy worker_opinions_write on public.worker_safety_opinions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=worker_safety_opinions.company_id and s.id=worker_safety_opinions.site_id and s.active));
create policy worker_responses_read on public.worker_opinion_responses for select to authenticated using(private.can_read_site(company_id,site_id));
create policy worker_responses_write on public.worker_opinion_responses for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=worker_opinion_responses.company_id and s.id=worker_opinion_responses.site_id and s.active) and exists(select 1 from public.worker_safety_opinions o where o.company_id=worker_opinion_responses.company_id and o.site_id=worker_opinion_responses.site_id and o.id=worker_opinion_responses.opinion_id) and (action_id is null or exists(select 1 from public.safety_actions a where a.company_id=worker_opinion_responses.company_id and a.site_id=worker_opinion_responses.site_id and a.id=worker_opinion_responses.action_id)));
insert into private.local_schema_versions values('worker-opinions-v1');
commit;
