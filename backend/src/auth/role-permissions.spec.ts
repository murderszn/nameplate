import { roleHasGlobalPropertyScope, roleHasPermissions } from './role-permissions';

describe('organization authorization matrix', () => {
  it('grants full access only to global roles', () => {
    expect(roleHasGlobalPropertyScope('owner')).toBe(true);
    expect(roleHasGlobalPropertyScope('hq_admin')).toBe(true);
    expect(roleHasGlobalPropertyScope('technician')).toBe(false);
  });

  it('requires every declared permission', () => {
    expect(roleHasPermissions('technician', ['assets:read', 'service_events:write'])).toBe(true);
    expect(roleHasPermissions('viewer', ['assets:write'])).toBe(false);
    expect(roleHasPermissions(undefined, ['org:read'])).toBe(false);
  });
});
