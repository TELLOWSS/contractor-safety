begin;
alter table public.risk_observations add column risk_revision integer check(risk_revision>=0);
create function private.capture_observation_risk_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select coalesce(max(r.revision),0) into new.risk_revision from public.work_risk_revisions r where r.company_id=new.company_id and r.site_id=new.site_id and r.risk_id=new.risk_id;
 return new;
end $$;
revoke all on function private.capture_observation_risk_revision() from public,anon,authenticated;
create trigger capture_observation_risk_revision before insert on public.risk_observations for each row execute function private.capture_observation_risk_revision();
insert into private.local_schema_versions values('risk-observation-version-v1');
commit;
