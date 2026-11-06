begin;
alter table public.site_work_permit_notes add constraint permit_note_scope unique(company_id,site_id,work_permit_id,id);
create table public.site_work_permit_note_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,work_permit_id uuid not null,note_id uuid not null,
 revision integer not null check(revision>0),
 kind text not null check(kind in ('허가 확인 메모','안전시설 확인 메모','작업 변경 메모','작업 중지 메모','작업 종료 메모','기타')),
 noted_on date not null,detail text not null check(length(trim(detail)) between 1 and 2000),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,work_permit_id,note_id,revision),
 foreign key(company_id,site_id,work_permit_id,note_id) references public.site_work_permit_notes(company_id,site_id,work_permit_id,id)
);
alter table public.site_work_permit_note_revisions enable row level security;
revoke all on public.site_work_permit_note_revisions from public,anon,authenticated;
grant select on public.site_work_permit_note_revisions to authenticated;
grant insert(company_id,site_id,work_permit_id,note_id,revision,kind,noted_on,detail,reason) on public.site_work_permit_note_revisions to authenticated;
create policy permit_note_revisions_read on public.site_work_permit_note_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy permit_note_revisions_write on public.site_work_permit_note_revisions for insert to authenticated with check(private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id) and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_work_permit_note_revisions.company_id and s.id=site_work_permit_note_revisions.site_id and s.active) and exists(select 1 from public.site_work_permit_notes n where n.company_id=site_work_permit_note_revisions.company_id and n.site_id=site_work_permit_note_revisions.site_id and n.work_permit_id=site_work_permit_note_revisions.work_permit_id and n.id=site_work_permit_note_revisions.note_id));
create function private.guard_permit_note_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.site_work_permit_note_revisions where company_id=new.company_id and site_id=new.site_id and work_permit_id=new.work_permit_id and note_id=new.note_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_permit_note_revision() from public,anon,authenticated;
create trigger guard_permit_note_revision before insert on public.site_work_permit_note_revisions for each row execute function private.guard_permit_note_revision();
insert into private.local_schema_versions values('site-work-permit-note-revisions-v1');
commit;
