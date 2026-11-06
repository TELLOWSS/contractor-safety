begin;
alter table public.site_requirements add column applicable_from date, add column applicable_until date;
alter table public.site_requirements add constraint requirement_period_order check(applicable_from is null or applicable_until is null or applicable_from<=applicable_until);
alter table public.site_requirement_revisions add column applicable_from date, add column applicable_until date;
alter table public.site_requirement_revisions add constraint requirement_revision_period_order check(applicable_from is null or applicable_until is null or applicable_from<=applicable_until);
grant insert(applicable_from,applicable_until) on public.site_requirements,public.site_requirement_revisions to authenticated;
insert into private.local_schema_versions values('site-requirement-period-v1');
commit;
