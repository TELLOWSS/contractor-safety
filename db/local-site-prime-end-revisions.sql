begin;
create table public.site_prime_end_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,prime_id uuid not null,
 revision integer not null check(revision>0), ends_on date not null,
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,prime_id,revision),
 foreign key(company_id,site_id,prime_id) references public.site_primes(company_id,site_id,id),
 foreign key(prime_id) references public.site_prime_ends(prime_id)
);
alter table public.site_prime_end_revisions enable row level security;
revoke all on public.site_prime_end_revisions from public,anon,authenticated;
grant select on public.site_prime_end_revisions to authenticated;
grant insert(company_id,site_id,prime_id,revision,ends_on,reason) on public.site_prime_end_revisions to authenticated;
create policy prime_end_revisions_read on public.site_prime_end_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy prime_end_revisions_write on public.site_prime_end_revisions for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(select 1 from public.site_prime_ends e where e.company_id=site_prime_end_revisions.company_id and e.site_id=site_prime_end_revisions.site_id and e.prime_id=site_prime_end_revisions.prime_id));
create function private.guard_prime_end_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer; started date;
begin
 select coalesce(max(revision),0) into latest from public.site_prime_end_revisions where company_id=new.company_id and site_id=new.site_id and prime_id=new.prime_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 select coalesce((select r.starts_on from public.site_prime_revisions r where r.company_id=p.company_id and r.site_id=p.site_id and r.prime_id=p.id order by r.revision desc limit 1),p.starts_on) into started from public.site_primes p where p.company_id=new.company_id and p.site_id=new.site_id and p.id=new.prime_id;
 if started is not null and new.ends_on<started then raise exception 'INVALID_PRIME_PERIOD'; end if;
 return new;
end $$;
revoke all on function private.guard_prime_end_revision() from public,anon,authenticated;
create trigger guard_prime_end_revision before insert on public.site_prime_end_revisions for each row execute function private.guard_prime_end_revision();
create or replace function private.guard_prime_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer; ended date;
begin
 select coalesce(max(revision),0) into latest from public.site_prime_revisions where company_id=new.company_id and site_id=new.site_id and prime_id=new.prime_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 select coalesce((select r.ends_on from public.site_prime_end_revisions r where r.company_id=e.company_id and r.site_id=e.site_id and r.prime_id=e.prime_id order by r.revision desc limit 1),e.ends_on) into ended from public.site_prime_ends e where e.company_id=new.company_id and e.site_id=new.site_id and e.prime_id=new.prime_id;
 if ended is not null and new.starts_on>ended then raise exception 'INVALID_PRIME_PERIOD'; end if;
 return new;
end $$;
insert into private.local_schema_versions values('site-prime-end-revisions-v1');
commit;
