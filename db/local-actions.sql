-- Additive local development upgrade. Existing sites and feedback are preserved.
begin;
create table public.safety_actions (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 site_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 150),
 assignee text not null check(length(trim(assignee)) between 1 and 80),
 due_date date not null,
 status text not null default 'open' check(status in ('open','requested','verified')),
 note text not null default '' check(length(note)<=2000),
 evidence_note text not null default '' check(length(evidence_note)<=2000),
 created_by uuid not null default auth.uid() references auth.users,
 requested_by uuid references auth.users,
 revision integer not null default 1,
 events jsonb not null default '[]',
 created_at timestamptz not null default now(),
 foreign key(company_id,site_id) references sites(company_id,id)
);
create index on safety_actions(company_id,site_id);
alter table safety_actions enable row level security;
revoke all on safety_actions from anon,authenticated;
grant select on safety_actions to authenticated;
grant insert(company_id,site_id,title,assignee,due_date) on safety_actions to authenticated;
grant update(status,note,evidence_note,revision) on safety_actions to authenticated;
create policy read_actions on safety_actions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy create_actions on safety_actions for insert to authenticated with check(
 private.can_read_site(company_id,site_id) and private.company_role(company_id) in ('owner','manager')
 and exists(select 1 from sites where sites.id=site_id and sites.active)
);
create policy update_actions on safety_actions for update to authenticated
 using(private.can_read_site(company_id,site_id) and private.company_role(company_id) in ('owner','manager'))
 with check(private.can_read_site(company_id,site_id) and private.company_role(company_id) in ('owner','manager'));
create function private.guard_action() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then
  new.events:=jsonb_build_array(jsonb_build_object('actor',auth.uid(),'at',now(),'status','open','note','등록','revision',1));
 else
  if new.revision<>old.revision+1 then raise exception 'REVISION_CONFLICT'; end if;
  if not ((old.status='open' and new.status='requested') or (old.status='requested' and new.status in ('open','verified'))) then raise exception 'INVALID_TRANSITION'; end if;
  if length(trim(new.note))=0 then raise exception 'NOTE_REQUIRED'; end if;
  if new.status='requested' then
   if length(trim(new.evidence_note))=0 then raise exception 'EVIDENCE_REQUIRED'; end if;
   new.requested_by:=auth.uid();
  else
   new.evidence_note:=old.evidence_note;
  end if;
  if new.status='verified' and (private.company_role(new.company_id)<>'owner' or auth.uid()=old.created_by or auth.uid()=old.requested_by) then raise exception 'INDEPENDENT_REVIEW_REQUIRED'; end if;
  new.events:=old.events||jsonb_build_array(jsonb_build_object('actor',auth.uid(),'at',now(),'status',new.status,'note',new.note,'evidence_note',new.evidence_note,'revision',new.revision));
 end if;
 return new;
end
$$;
revoke all on function private.guard_action() from public,anon,authenticated;
create trigger guard_action before insert or update on safety_actions for each row execute function private.guard_action();
commit;
