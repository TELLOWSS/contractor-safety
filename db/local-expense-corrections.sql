begin;
alter table public.budget_expenses add constraint expense_company_unique unique(company_id,id);
create table public.expense_corrections (
 id uuid primary key default gen_random_uuid(), company_id uuid not null,
 expense_id uuid not null, revision integer not null check(revision>0),
 spent_on date not null, amount bigint not null check(amount between 1 and 1000000000000),
 description text not null check(length(trim(description)) between 1 and 1000),
 evidence_note text not null check(length(trim(evidence_note)) between 1 and 1000),
 reason text not null check(length(trim(reason)) between 1 and 1000),
 recorded_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now(),
 foreign key(company_id,expense_id) references public.budget_expenses(company_id,id),
 unique(company_id,expense_id,revision)
);
alter table expense_corrections enable row level security;
revoke all on expense_corrections from public,anon,authenticated;
grant select on expense_corrections to authenticated;
grant insert(company_id,expense_id,revision,spent_on,amount,description,evidence_note,reason) on expense_corrections to authenticated;
create policy correction_read on expense_corrections for select to authenticated using(private.company_role(company_id)='owner');
create policy correction_write on expense_corrections for insert to authenticated with check(private.company_role(company_id)='owner' and recorded_by=(select auth.uid()) and exists(select 1 from public.budget_expenses e where e.company_id=expense_corrections.company_id and e.id=expense_corrections.expense_id));
create function private.guard_expense_correction() returns trigger language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 select coalesce(max(revision),0) into latest from public.expense_corrections where company_id=new.company_id and expense_id=new.expense_id;
 if new.revision<>latest+1 then raise exception 'REVISION_CONFLICT'; end if;
 return new;
end $$;
revoke all on function private.guard_expense_correction() from public,anon,authenticated;
create trigger guard_expense_correction before insert on expense_corrections for each row execute function private.guard_expense_correction();
insert into private.local_schema_versions values('expense-corrections-v1');
commit;
