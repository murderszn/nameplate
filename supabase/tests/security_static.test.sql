-- Lightweight review assertions; execute with psql against a Supabase local
-- instance after applying the policy files.
select has_table_privilege('authenticated', 'public.organization', 'select') = false
  as authenticated_does_not_bypass_table_grants;
select relrowsecurity from pg_class where oid = 'public.asset'::regclass;
select relforcerowsecurity from pg_class where oid = 'public.asset'::regclass;
select count(*) = 28 as every_nameplate_table_has_rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'organization', 'user_account', 'membership', 'property_assignment',
    'property', 'building', 'unit', 'asset_category', 'asset_model', 'asset',
    'service_event', 'work_order', 'part_catalog', 'part', 'part_usage',
    'device', 'storage_location', 'asset_location', 'asset_identifier_scan',
    'media', 'media_attachment', 'vendor', 'turn', 'turn_item',
    'reconciliation_flag', 'sync_op', 'audit_log', 'metric_snapshot'
  )
  and c.relrowsecurity;
select rolname = 'nameplate_app' and not rolbypassrls and not rolcanlogin
  as application_role_cannot_bypass_rls
from pg_roles where rolname = 'nameplate_app';
select not exists (
  select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and policyname = 'media_read' and qual like '%public.is_active_org_member%'
) = false as media_read_checks_membership;
