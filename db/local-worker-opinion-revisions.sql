begin;
alter table public.worker_opinion_responses add constraint opinion_response_scope unique(company_id,site_id,opinion_id,id);
create table public.worker_opinion_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,opinion_id uuid not null,revision integer not null check(revision>0),
 received_on date not null,content text not null check(length(trim(content)) between 1 and 2000),source_note text not null default '' check(length(source_note)<=500),
 reason text not null check(length(trim(reason)) between 1 and 1000),recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,opinion_id,revision),foreign key(company_id,site_id,opinion_id) references public.worker_safety_opinions(company_id,site_id,id)
);
create table public.worker_response_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,opinion_id uuid not null,response_id uuid not null,revision integer not null check(revision>0),action_id uuid,
 kind text not null check(kind in ('검토 기록','회신 기록','조치 기록')),noted_on date not null,detail text not null check(length(trim(detail)) between 1 and 2000),
 reason text not null check(length(trim(reason)) between 1 and 1000),recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,opinion_id,response_id,revision),foreign key(company_id,site_id,opinion_id,response_id) references public.worker_opinion_responses(company_id,site_id,opinion_id,id),
 foreign key(company_id,site_id,action_id) references public.safety_actions(company_id,site_id,id)
);
alter table public.worker_opinion_revisions enable row level security;
alter table public.worker_response_revisions enable row level security;
revoke all on public.worker_opinion_revisions,public.worker_response_revisions from public,anon,authenticated;
grant select on public.worker_opinion_revisions,public.worker_response_revisions to authenticated;
grant insert(company_id,site_id,opinion_id,revision,received_on,content,source_note,reason) on public.worker_opinion_revisions to authenticated;
grant insert(company_id,site_id,opinion_id,response_id,revision,action_id,kind,noted_on,detail,reason) on public.worker_response_revisions to authenticated;
create policy opinion_revisions_read on public.worker_opinion_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy response_revisions_read on public.worker_response_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy opinion_revisions_write on public.worker_opinion_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=worker_opinion_revisions.company_id and s.id=worker_opinion_revisions.site_id and s.active) and exists(select 1 from public.worker_safety_opinions o where o.company_id=worker_opinion_revisions.company_id and o.site_id=worker_opinion_revisions.site_id and o.id=worker_opinion_revisions.opinion_id));
create policy response_revisions_write on public.worker_response_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=worker_response_revisions.company_id and s.id=worker_response_revisions.site_id and s.active) and exists(select 1 from public.worker_opinion_responses r where r.company_id=worker_response_revisions.company_id and r.site_id=worker_response_revisions.site_id and r.opinion_id=worker_response_revisions.opinion_id and r.id=worker_response_revisions.response_id) and (action_id is null or exists(select 1 from public.safety_actions a where a.company_id=worker_response_revisions.company_id and a.site_id=worker_response_revisions.site_id and a.id=worker_response_revisions.action_id)));
create function private.guard_worker_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 if tg_table_name='worker_opinion_revisions' then select coalesce(max(revision),0) into latest from public.worker_opinion_revisions where company_id=new.company_id and site_id=new.site_id and opinion_id=new.opinion_id;
 else select coalesce(max(revision),0) into latest from public.worker_response_revisions where company_id=new.company_id and site_id=new.site_id and opinion_id=new.opinion_id and response_id=new.response_id; end if;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;return new;
end $$;
revoke all on function private.guard_worker_revision() from public,anon,authenticated;
create trigger guard_opinion_revision before insert on public.worker_opinion_revisions for each row execute function private.guard_worker_revision();
create trigger guard_response_revision before insert on public.worker_response_revisions for each row execute function private.guard_worker_revision();
insert into private.local_schema_versions values('worker-opinion-revisions-v1');
commit;
