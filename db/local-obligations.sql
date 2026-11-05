begin;
create table public.obligations (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies,
 title text not null check(length(trim(title)) between 1 and 150),
 reference text not null check(length(trim(reference)) between 1 and 500),
 source_version text not null check(length(trim(source_version)) between 1 and 150),
 effective_on date not null,
 applicability text not null default 'pending' check(applicability in ('pending','applicable','not_applicable','review')),
 reason text not null default '' check(length(reason)<=3000),
 next_review date not null,
 reviewed_by uuid not null default auth.uid() references auth.users,
 reviewed_at timestamptz not null default now(),
 change_note text not null check(length(trim(change_note)) between 1 and 2000),
 revision integer not null default 1,
 events jsonb not null default '[]',
 unique(company_id,id),
 check(applicability='pending' or length(trim(reason))>0)
);
create index on obligations(company_id);
alter table obligations enable row level security;
revoke all on obligations from anon,authenticated;
grant select on obligations to authenticated;
grant insert(company_id,title,reference,source_version,effective_on,applicability,reason,next_review,change_note) on obligations to authenticated;
grant update(title,reference,source_version,effective_on,applicability,reason,next_review,change_note,revision) on obligations to authenticated;
create policy read_obligations on obligations for select to authenticated using(private.company_role(company_id) is not null);
create policy create_obligations on obligations for insert to authenticated with check(private.company_role(company_id)='owner');
create policy update_obligations on obligations for update to authenticated using(private.company_role(company_id)='owner') with check(private.company_role(company_id)='owner');
create function private.guard_obligation() returns trigger language plpgsql security invoker set search_path='' as $$
declare prior jsonb;
begin
 if TG_OP='UPDATE' then
  if new.revision<>old.revision+1 then raise exception 'REVISION_CONFLICT'; end if;
  prior:=to_jsonb(old)-'events';
 else
  prior:=null;
 end if;
 if length(trim(new.change_note))=0 then raise exception 'NOTE_REQUIRED'; end if;
 if new.applicability<>'pending' and length(trim(new.reason))=0 then raise exception 'REASON_REQUIRED'; end if;
 new.reviewed_by:=auth.uid();new.reviewed_at:=now();
 new.events:=case when TG_OP='INSERT' then '[]'::jsonb else old.events end || jsonb_build_array(jsonb_build_object('before',prior,'after',to_jsonb(new)-'events','actor',auth.uid(),'at',now()));
 return new;
end
$$;
revoke all on function private.guard_obligation() from public,anon,authenticated;
create trigger guard_obligation before insert or update on obligations for each row execute function private.guard_obligation();

alter table safety_actions add column obligation_id uuid;
alter table safety_actions add column obligation_snapshot jsonb;
alter table safety_actions add foreign key(company_id,obligation_id) references obligations(company_id,id);
create index on safety_actions(company_id,obligation_id);
grant insert(obligation_id) on safety_actions to authenticated;
create function private.link_action_obligation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.obligation_id is not null then
  select to_jsonb(o)-'events' into new.obligation_snapshot from public.obligations o where o.id=new.obligation_id and o.company_id=new.company_id;
  if new.obligation_snapshot is null then raise exception 'OBLIGATION_ACCESS_DENIED'; end if;
 end if;
 return new;
end
$$;
revoke all on function private.link_action_obligation() from public,anon,authenticated;
create trigger link_action_obligation before insert on safety_actions for each row execute function private.link_action_obligation();
insert into private.local_schema_versions(version) values('obligations-v1');
commit;
