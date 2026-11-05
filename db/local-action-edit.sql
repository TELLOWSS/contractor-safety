begin;
grant update(title,assignee,due_date) on public.safety_actions to authenticated;
create or replace function private.guard_action() returns trigger language plpgsql security invoker set search_path='' as $$
declare details_changed boolean;
begin
 if TG_OP='INSERT' then
  new.events:=jsonb_build_array(jsonb_build_object('actor',auth.uid(),'at',now(),'status','open','note','등록','revision',1,'kind','created','after',jsonb_build_object('title',new.title,'assignee',new.assignee,'due_date',new.due_date)));
 else
  if new.revision<>old.revision+1 then raise exception 'REVISION_CONFLICT'; end if;
  details_changed:=row(new.title,new.assignee,new.due_date) is distinct from row(old.title,old.assignee,old.due_date);
  if details_changed then
   if old.status<>'open' or new.status<>'open' then raise exception 'EDIT_LOCKED'; end if;
   if length(trim(new.note))=0 then raise exception 'NOTE_REQUIRED'; end if;
   new.evidence_note:=old.evidence_note;
   new.events:=old.events||jsonb_build_array(jsonb_build_object('actor',auth.uid(),'at',now(),'status',new.status,'note',new.note,'revision',new.revision,'kind','edited',
    'before',jsonb_build_object('title',old.title,'assignee',old.assignee,'due_date',old.due_date),
    'after',jsonb_build_object('title',new.title,'assignee',new.assignee,'due_date',new.due_date)));
   return new;
  end if;
  if new.status=old.status then raise exception 'NO_CHANGES'; end if;
  if not ((old.status='open' and new.status='requested') or (old.status='requested' and new.status in ('open','verified'))) then raise exception 'INVALID_TRANSITION'; end if;
  if length(trim(new.note))=0 then raise exception 'NOTE_REQUIRED'; end if;
  if new.status='requested' then
   if length(trim(new.evidence_note))=0 then raise exception 'EVIDENCE_REQUIRED'; end if;
   new.requested_by:=auth.uid();
  else
   new.evidence_note:=old.evidence_note;
  end if;
  if new.status='verified' and (private.company_role(new.company_id)<>'owner' or auth.uid()=old.created_by or auth.uid()=old.requested_by) then raise exception 'INDEPENDENT_REVIEW_REQUIRED'; end if;
  new.events:=old.events||jsonb_build_array(jsonb_build_object('actor',auth.uid(),'at',now(),'status',new.status,'note',new.note,'evidence_note',new.evidence_note,'revision',new.revision,'kind','transition'));
 end if;
 return new;
end
$$;
revoke all on function private.guard_action() from public,anon,authenticated;
insert into private.local_schema_versions(version) values('action-edit-v1');
commit;
