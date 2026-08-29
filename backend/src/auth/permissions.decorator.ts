import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'nameplate:required_permissions';
export const PROPERTY_SCOPE_KEY = 'nameplate:property_scope';

export type Permission =
  | 'org:read'
  | 'org:manage'
  | 'users:read'
  | 'users:manage'
  | 'properties:read'
  | 'properties:manage'
  | 'assets:read'
  | 'assets:write'
  | 'service_events:read'
  | 'service_events:write'
  | 'work_orders:read'
  | 'work_orders:write'
  | 'parts:read'
  | 'parts:write'
  | 'sync:read'
  | 'sync:write';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const RequirePropertyScope = (param = 'propertyId') =>
  SetMetadata(PROPERTY_SCOPE_KEY, param);
