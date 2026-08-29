import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { MembershipContextGuard } from './membership-context.guard';

function httpContext(request: object): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
}

describe('MembershipContextGuard', () => {
  const membership = {
    id: 'membership-1', orgId: 'org-a', userId: 'user-1', role: 'technician', status: 'active',
    propertyAssignments: [{ propertyId: 'property-a' }],
  };

  it('hydrates org and membership before downstream guards run', async () => {
    const request = { auth: { id: 'user-1', claims: { sub: 'user-1', active_org_id: 'org-a' } } };
    const prisma = { membership: { findMany: jest.fn().mockResolvedValue([membership]) } };
    const allowed = await new MembershipContextGuard(prisma as never).canActivate(httpContext(request));
    expect(allowed).toBe(true);
    expect(request).toMatchObject({ orgId: 'org-a', membership });
  });

  it('rejects an active-org claim that is not one of the user memberships', async () => {
    const request = { auth: { id: 'user-1', claims: { sub: 'user-1', active_org_id: 'org-b' } } };
    const prisma = { membership: { findMany: jest.fn().mockResolvedValue([membership]) } };
    await expect(new MembershipContextGuard(prisma as never).canActivate(httpContext(request))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
