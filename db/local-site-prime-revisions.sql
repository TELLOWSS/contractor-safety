begin;
create table public.site_prime_revisions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,site_id uuid not null,prime_id uuid not null,
 revision integer not null check(revision>0),prime_name text not null check(length(trim(prime_name)) between 1 and 150),
 relationship text not null check(length(trim(relationship)) between 1 and 100), starts_on date not null,
 note text not null default '' check(length(note)<=1000),reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,created_at timestamptz not null default now(),
 unique(company_id,site_id,prime_id,revision),foreign key(company_id,site_id,prime_id) references public.site_primes(company_id,site_id,id)
);
alter table public.site_prime_revisions enable row level security;
revoke all on public.site_prime_revisions from public,anon,authenticated;
grant select on public.site_prime_revisions to authenticated;
grant insert(company_id,site_id,prime_id,revision,prime_name,relationship,starts_on,note,reason) on public.site_prime_revisions to authenticated;
create policy prime_revisions_read on public.site_prime_revisions for select to authenticated using(private.can_read_site(company_id,site_id));
create policy prime_revisions_write on public.site_prime_revisions for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(select 1 from public.site_primes p where p.company_id=site_prime_revisions.company_id and p.site_id=site_prime_revisions.site_id and p.id=site_prime_revisions.prime_id));
create function private.guard_prime_revision() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer; ended date;
begin
 select coalesce(max(revision),0) into latest from public.site_prime_revisions where company_id=new.company_id and site_id=new.site_id and prime_id=new.prime_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 select ends_on into ended from public.site_prime_ends where company_id=new.company_id and site_id=new.site_id and prime_id=new.prime_id;
 if ended is not null and new.starts_on>ended then raise exception 'INVALID_PRIME_PERIOD'; end if;
 return new;
end $$;
revoke all on function private.guard_prime_revision() from public,anon,authenticated;
create trigger guard_prime_revision before insert on public.site_prime_revisions for each row execute function private.guard_prime_revision();
drop policy ends_insert on public.site_prime_ends;
create policy ends_insert on public.site_prime_ends for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(select 1 from public.site_primes p where p.company_id=site_prime_ends.company_id and p.site_id=site_prime_ends.site_id and p.id=site_prime_ends.prime_id and site_prime_ends.ends_on>=coalesce((select r.starts_on from public.site_prime_revisions r where r.company_id=p.company_id and r.site_id=p.site_id and r.prime_id=p.id order by r.revision desc limit 1),p.starts_on)));
insert into private.local_schema_versions values('site-prime-revisions-v1');
commit;
