import type { Permission } from './permissions.decorator';

const all: Permission[] = [
  'org:read',
  'org:manage',
  'users:read',
  'users:manage',
  'properties:read',
  'properties:manage',
  'assets:read',
  'assets:write',
  'service_events:read',
  'service_events:write',
  'work_orders:read',
  'work_orders:write',
  'parts:read',
  'parts:write',
  'sync:read',
  'sync:write',
];

export const ROLE_PERMISSIONS: Readonly<Record<string, readonly Permission[]>> = {
  owner: all,
  hq_admin: all,
  property_manager: [
    'org:read',
    'users:read',
    'properties:read',
    'properties:manage',
    'assets:read',
    'assets:write',
    'service_events:read',
    'service_events:write',
    'work_orders:read',
    'work_orders:write',
    'parts:read',
    'parts:write',
    'sync:read',
    'sync:write',
  ],
  lead_tech: [
    'org:read',
    'properties:read',
    'assets:read',
    'assets:write',
    'service_events:read',
    'service_events:write',
    'work_orders:read',
    'work_orders:write',
    'parts:read',
    'parts:write',
    'sync:read',
    'sync:write',
  ],
  technician: [
    'org:read',
    'properties:read',
    'assets:read',
    'assets:write',
    'service_events:read',
    'service_events:write',
    'work_orders:read',
    'work_orders:write',
    'parts:read',
    'parts:write',
    'sync:read',
    'sync:write',
  ],
  viewer: ['org:read', 'properties:read', 'assets:read', 'service_events:read', 'work_orders:read', 'parts:read', 'sync:read'],
  service_account: all,
};

export function roleHasPermissions(
  role: string | undefined,
  required: readonly Permission[],
): boolean {
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role] ?? [];
  return required.every((permission) => granted.includes(permission));
}

export function roleHasGlobalPropertyScope(role: string | undefined): boolean {
  return role === 'owner' || role === 'hq_admin' || role === 'service_account';
}
