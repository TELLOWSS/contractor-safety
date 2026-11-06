begin;
alter table public.site_work_permit_notes add column permit_revision integer check(permit_revision>=0);
create function private.capture_work_permit_note_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select coalesce(max(r.revision),0) into new.permit_revision from public.site_work_permit_revisions r where r.company_id=new.company_id and r.site_id=new.site_id and r.work_permit_id=new.work_permit_id;
 return new;
end $$;
revoke all on function private.capture_work_permit_note_version() from public,anon,authenticated;
create trigger capture_work_permit_note_version before insert on public.site_work_permit_notes for each row execute function private.capture_work_permit_note_version();
insert into private.local_schema_versions values('work-permit-note-version-v1');
commit;
