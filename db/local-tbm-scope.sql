begin;
alter table public.tbm_sessions add column attendance_scope text check(attendance_scope in ('원청 관리','협력사 관리','공동 관리','확인 필요','기타'));
alter table public.tbm_sessions add column education_label text check(education_label is null or length(trim(education_label)) between 1 and 150);
alter table public.tbm_sessions add column scope_note text check(scope_note is null or length(trim(scope_note)) between 1 and 1000);
grant insert(attendance_scope,education_label,scope_note) on public.tbm_sessions to authenticated;
insert into private.local_schema_versions values('tbm-scope-v1');
commit;
