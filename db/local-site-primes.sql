begin;
create table public.site_primes (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, site_id uuid not null,
 prime_name text not null check(length(trim(prime_name)) between 1 and 150),
 relationship text not null check(length(trim(relationship)) between 1 and 100),
 starts_on date not null, note text not null default '' check(length(note)<=1000),
 recorded_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now(),
 unique(company_id,site_id,id), foreign key(company_id,site_id) references public.sites(company_id,id)
);
create table public.site_prime_ends (
 company_id uuid not null, site_id uuid not null, prime_id uuid primary key,
 ends_on date not null, reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now(),
 foreign key(company_id,site_id,prime_id) references public.site_primes(company_id,site_id,id)
);
alter table public.site_primes enable row level security;
alter table public.site_prime_ends enable row level security;
revoke all on public.site_primes,public.site_prime_ends from public,anon,authenticated;
grant select on public.site_primes,public.site_prime_ends to authenticated;
grant insert(company_id,site_id,prime_name,relationship,starts_on,note) on public.site_primes to authenticated;
grant insert(company_id,site_id,prime_id,ends_on,reason) on public.site_prime_ends to authenticated;
create policy primes_read on public.site_primes for select to authenticated using(private.can_read_site(company_id,site_id));
create policy primes_insert on public.site_primes for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(select 1 from public.sites s where s.company_id=site_primes.company_id and s.id=site_primes.site_id and s.active));
create policy ends_read on public.site_prime_ends for select to authenticated using(private.can_read_site(company_id,site_id));
create policy ends_insert on public.site_prime_ends for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(select 1 from public.site_primes p where p.company_id=site_prime_ends.company_id and p.site_id=site_prime_ends.site_id and p.id=site_prime_ends.prime_id and site_prime_ends.ends_on>=p.starts_on));
create index on public.site_primes(company_id,site_id);
insert into private.local_schema_versions values('site-primes-v1');
commit;
