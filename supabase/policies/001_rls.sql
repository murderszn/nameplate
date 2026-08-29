-- Nameplate tenant isolation. The Nest API sets these transaction-local GUCs
-- using SET LOCAL/set_config(..., true); PostgREST requests use auth.uid().
create schema if not exists app;

create or replace function public.current_org_id()
returns uuid
language sql stable security invoker
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('app.current_org_id', true), '')::uuid,
    nullif(auth.jwt() ->> 'active_org_id', '')::uuid,
    nullif(auth.jwt() ->> 'org_id', '')::uuid,
    nullif(auth.jwt() ->> 'organization_id', '')::uuid
  )
$$;

create or replace function public.current_user_id()
returns uuid
language sql stable security invoker
set search_path = public
as $$
  select coalesce(auth.uid(), nullif(current_setting('app.current_user_id', true), '')::uuid)
$$;

create or replace function public.is_active_org_member(target_org_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membership m
    where m.org_id = target_org_id
      and m.user_id = public.current_user_id()
      and m.status = 'active'
      and m.deleted_at is null
  )
$$;

create or replace function public.has_global_org_role(target_org_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.membership m
    where m.org_id = target_org_id
      and m.user_id = public.current_user_id()
      and m.status = 'active'
      and m.deleted_at is null
      and m.role in ('owner', 'hq_admin', 'service_account')
  )
$$;

create or replace function public.can_access_property(target_org_id uuid, target_property_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.current_org_id() = target_org_id
    and public.is_active_org_member(target_org_id)
    and (
      public.has_global_org_role(target_org_id)
      or exists (
        select 1
        from public.membership m
        join public.property_assignment pa on pa.membership_id = m.id
        where m.org_id = target_org_id
          and m.user_id = public.current_user_id()
          and m.status = 'active'
          and m.deleted_at is null
          and pa.org_id = target_org_id
          and pa.property_id = target_property_id
          and pa.deleted_at is null
      )
    )
$$;

revoke all on function public.current_org_id() from public;
revoke all on function public.current_user_id() from public;
grant execute on function public.current_org_id() to anon, authenticated, service_role;
grant execute on function public.current_user_id() to anon, authenticated, service_role;
grant execute on function public.is_active_org_member(uuid) to anon, authenticated, service_role;
grant execute on function public.has_global_org_role(uuid) to anon, authenticated, service_role;
grant execute on function public.can_access_property(uuid, uuid) to anon, authenticated, service_role;

-- Identity is linked to auth.users by id. A member may see users in the
-- active organization; a user can always see/update their own profile.
alter table public.user_account enable row level security;
create policy user_account_select on public.user_account for select using (
  id = public.current_user_id()
  or exists (select 1 from public.membership m where m.user_id = user_account.id and m.org_id = public.current_org_id() and m.status = 'active' and m.deleted_at is null)
);
create policy user_account_update on public.user_account for update using (id = public.current_user_id()) with check (id = public.current_user_id());

alter table public.organization enable row level security;
create policy organization_tenant on public.organization for all
  using (id = public.current_org_id() and public.is_active_org_member(id))
  with check (id = public.current_org_id() and public.is_active_org_member(id));

alter table public.membership enable row level security;
create policy membership_tenant on public.membership for all
  using (org_id = public.current_org_id() and public.is_active_org_member(org_id))
  with check (org_id = public.current_org_id() and public.is_active_org_member(org_id));

alter table public.property_assignment enable row level security;
create policy property_assignment_tenant on public.property_assignment for all
  using (org_id = public.current_org_id() and public.is_active_org_member(org_id))
  with check (org_id = public.current_org_id() and public.is_active_org_member(org_id));

alter table public.property enable row level security;
create policy property_scoped on public.property for all
  using (public.can_access_property(org_id, id))
  with check (public.can_access_property(org_id, id));

alter table public.building enable row level security;
create policy building_scoped on public.building for all
  using (public.can_access_property(org_id, property_id))
  with check (public.can_access_property(org_id, property_id));

alter table public.unit enable row level security;
create policy unit_scoped on public.unit for all
  using (public.can_access_property(org_id, property_id))
  with check (public.can_access_property(org_id, property_id));

alter table public.asset_category enable row level security;
create policy asset_category_read on public.asset_category for select using (
  org_id is null or (org_id = public.current_org_id() and public.is_active_org_member(org_id))
);
create policy asset_category_write on public.asset_category for all using (
  org_id is not null and org_id = public.current_org_id() and public.is_active_org_member(org_id)
) with check (org_id is not null and org_id = public.current_org_id() and public.is_active_org_member(org_id));

-- Asset model and part catalog are intentionally cross-tenant reference data.
-- They are readable to signed-in users; writes stay in the trusted API role.
alter table public.asset_model enable row level security;
create policy asset_model_authenticated_read on public.asset_model for select to authenticated using (true);
alter table public.part_catalog enable row level security;
create policy part_catalog_authenticated_read on public.part_catalog for select to authenticated using (true);

alter table public.asset enable row level security;
create policy asset_scoped on public.asset for all
  using (org_id = public.current_org_id() and public.is_active_org_member(org_id) and (current_property_id is null or public.can_access_property(org_id, current_property_id)))
  with check (org_id = public.current_org_id() and public.is_active_org_member(org_id) and (current_property_id is null or public.can_access_property(org_id, current_property_id)));

alter table public.service_event enable row level security;
create policy service_event_scoped on public.service_event for all
  using (org_id = public.current_org_id() and public.is_active_org_member(org_id) and (property_id is null or public.can_access_property(org_id, property_id)))
  with check (org_id = public.current_org_id() and public.is_active_org_member(org_id) and (property_id is null or public.can_access_property(org_id, property_id)));

alter table public.work_order enable row level security;
create policy work_order_scoped on public.work_order for all
  using (public.can_access_property(org_id, property_id))
  with check (public.can_access_property(org_id, property_id));

alter table public.part enable row level security;
create policy part_tenant on public.part for all
  using (org_id = public.current_org_id() and public.is_active_org_member(org_id))
  with check (org_id = public.current_org_id() and public.is_active_org_member(org_id));

alter table public.part_usage enable row level security;
create policy part_usage_tenant on public.part_usage for all
  using (org_id = public.current_org_id() and public.is_active_org_member(org_id))
  with check (org_id = public.current_org_id() and public.is_active_org_member(org_id));
