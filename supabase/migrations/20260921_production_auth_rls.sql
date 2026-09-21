-- Phase 2: production authentication/RLS enforcement.
-- Apply 202609210001_prepare_auth.sql and run `pnpm auth:provision` first.

begin;

-- Fail before changing policies if the one-time provisioning step was skipped.
do $$
begin
  if exists (select 1 from public.users where auth_user_id is null) then
    raise exception 'Auth cut-over stopped: users.auth_user_id contains unmapped accounts';
  end if;
end $$;

-- These helpers are SECURITY DEFINER so policies never recurse through users.
create or replace function public.current_app_user_id()
returns bigint
language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select id from public.users where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.current_shop_id()
returns bigint
language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select shop_id from public.users where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select coalesce((select role = 'super_admin' from public.users where auth_user_id = auth.uid() limit 1), false)
$$;

create or replace function public.is_shop_owner(target_shop_id bigint)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select coalesce((select role = 'owner' and shop_id = target_shop_id from public.users where auth_user_id = auth.uid() limit 1), false)
$$;

revoke all on function public.current_app_user_id() from public;
revoke all on function public.current_shop_id() from public;
revoke all on function public.is_super_admin() from public;
revoke all on function public.is_shop_owner(bigint) from public;
revoke execute on function public.current_app_user_id() from anon;
revoke execute on function public.current_shop_id() from anon;
revoke execute on function public.is_super_admin() from anon;
revoke execute on function public.is_shop_owner(bigint) from anon;
grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_shop_id() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_shop_owner(bigint) to authenticated;

-- Remove every legacy permissive policy, regardless of its name.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'shops','users','categories','units','items','price_tiers','sales',
        'sale_items','stock_history','batches','alerts','credit_customers',
        'credit_entries','app_settings','subscriptions','shop_payment_info',
        'audit_logs','user_roles','system_health_checks'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Tenant-owned data: authenticated users can only touch rows for their shop;
-- super admins retain operational access across shops.
do $$
declare t text;
begin
  foreach t in array array[
    'categories','units','items','price_tiers','sales','sale_items',
    'stock_history','batches','alerts','credit_customers','credit_entries',
    'app_settings','subscriptions','shop_payment_info','audit_logs',
    'system_health_checks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy tenant_isolation on public.%I for all to authenticated using (shop_id = public.current_shop_id() or public.is_super_admin()) with check (shop_id = public.current_shop_id() or public.is_super_admin())',
      t
    );
  end loop;
end $$;

alter table public.shops enable row level security;
alter table public.shops force row level security;
create policy shops_select on public.shops for select to authenticated
  using (id = public.current_shop_id() or public.is_super_admin());
create policy shops_admin_write on public.shops for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.users enable row level security;
alter table public.users force row level security;
create policy users_select on public.users for select to authenticated
  using (auth_user_id = auth.uid() or public.is_shop_owner(shop_id) or public.is_super_admin());
create policy users_admin_write on public.users for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
create policy roles_select on public.user_roles for select to authenticated
  using (user_id = public.current_app_user_id() or public.is_shop_owner(shop_id) or public.is_super_admin());
create policy roles_owner_write on public.user_roles for all to authenticated
  using (public.is_shop_owner(shop_id) or public.is_super_admin())
  with check (public.is_shop_owner(shop_id) or public.is_super_admin());

-- Passwords belong only in auth.users. Drop the legacy NOT NULL constraints
-- before clearing values, otherwise the transaction cannot complete.
alter table public.users alter column password drop not null;
alter table public.shops alter column password drop not null;
update public.users set password = null where auth_user_id is not null;
update public.shops s set password = null
where exists (select 1 from public.users u where u.shop_id = s.id and u.role = 'owner' and u.auth_user_id is not null);

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

commit;
