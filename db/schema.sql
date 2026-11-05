-- New, isolated Supabase project only. Reviewed draft; not applied to existing projects.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100)
);
create table public.company_members (
  company_id uuid references public.companies not null,
  user_id uuid references auth.users not null,
  role text not null check (role in ('owner','manager','viewer')),
  active boolean not null default true,
  primary key(company_id,user_id)
);
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies not null,
  name text not null check (length(trim(name)) between 1 and 60),
  active boolean not null default true,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  unique(company_id,id)
);
create table public.site_members (
  company_id uuid not null,
  site_id uuid not null,
  user_id uuid not null,
  primary key(company_id,site_id,user_id),
  foreign key(company_id,site_id) references public.sites(company_id,id),
  foreign key(company_id,user_id) references public.company_members(company_id,user_id)
);
create table public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  site_id uuid not null,
  created_by uuid not null default auth.uid() references auth.users,
  feature text not null check(length(trim(feature)) between 1 and 100),
  decision text not null check(decision in ('유지','보완','보류','제외 검토')),
  reason text not null check(length(trim(reason)) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key(company_id,site_id) references public.sites(company_id,id)
);
create index on company_members(user_id);
create index on site_members(user_id);
create index on sites(company_id);
create index on pilot_feedback(company_id,site_id);

-- Own membership is readable; clients cannot grant themselves membership or roles.
alter table companies enable row level security;
alter table company_members enable row level security;
alter table sites enable row level security;
alter table site_members enable row level security;
alter table pilot_feedback enable row level security;
revoke all on companies,company_members,sites,site_members,pilot_feedback from anon,authenticated;
grant select on companies,company_members,sites,site_members,pilot_feedback to authenticated;
grant insert(company_id,name) on sites to authenticated;
grant update(name,active,revision) on sites to authenticated;
grant insert(company_id,site_id,feature,decision,reason) on pilot_feedback to authenticated;
create policy own_membership on company_members for select to authenticated using(user_id=(select auth.uid()));
create policy own_site_membership on site_members for select to authenticated using(user_id=(select auth.uid()));
create policy member_company on companies for select to authenticated using(exists(
  select 1 from company_members m where m.company_id=companies.id and m.user_id=(select auth.uid()) and m.active
));

-- Invoker helpers honor membership RLS. No JWT metadata or client role is trusted.
create function private.company_role(c uuid) returns text language sql stable security invoker set search_path='' as $$
  select role from public.company_members where company_id=c and user_id=(select auth.uid()) and active
$$;
create function private.can_read_site(c uuid,s uuid) returns boolean language sql stable security invoker set search_path='' as $$
  select private.company_role(c) is not null and (
    private.company_role(c)='owner' or exists(select 1 from public.site_members where company_id=c and site_id=s and user_id=(select auth.uid()))
  )
$$;
revoke all on function private.company_role(uuid),private.can_read_site(uuid,uuid) from public;
grant execute on function private.company_role(uuid),private.can_read_site(uuid,uuid) to authenticated;
create policy readable_sites on sites for select to authenticated using(private.can_read_site(company_id,id));
create policy owner_create_sites on sites for insert to authenticated with check(private.company_role(company_id)='owner');
create policy owner_update_sites on sites for update to authenticated using(private.company_role(company_id)='owner') with check(private.company_role(company_id)='owner');
create policy readable_feedback on pilot_feedback for select to authenticated using(private.can_read_site(company_id,site_id));
create policy write_feedback on pilot_feedback for insert to authenticated with check(
  created_by=(select auth.uid()) and private.company_role(company_id) in ('owner','manager') and private.can_read_site(company_id,site_id)
  and exists(select 1 from sites where id=site_id and company_id=pilot_feedback.company_id and active)
);

-- Serialize all activation operations on the company row, including concurrent inserts.
-- Definer is necessary to lock the non-client-writable parent and count all sites.
create function private.guard_site() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.company_members where company_id=new.company_id and user_id=auth.uid() and active and role='owner') then
    raise exception 'ACCESS_DENIED';
  end if;
  if TG_OP='UPDATE' then
    if new.company_id<>old.company_id or new.id<>old.id then raise exception 'IMMUTABLE_SCOPE'; end if;
    if new.revision<>old.revision+1 then raise exception 'REVISION_CONFLICT'; end if;
  else
    new.revision:=1;
  end if;
  perform 1 from public.companies where id=new.company_id for update;
  if new.active and (select count(*) from public.sites where company_id=new.company_id and active and id<>new.id)>=15 then
    raise exception 'ACTIVE_SITE_LIMIT';
  end if;
  return new;
end
$$;
revoke all on function private.guard_site() from public,anon,authenticated;
create trigger guard_site before insert or update on sites for each row execute function private.guard_site();
commit;
