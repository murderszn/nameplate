import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthRequest, MembershipContext } from './auth.types';

function activeOrgClaim(request: AuthRequest): string | undefined {
  const claims = (request.auth?.claims ?? {}) as Record<string, unknown>;
  const metadata = typeof claims.app_metadata === 'object' && claims.app_metadata !== null
    ? claims.app_metadata as Record<string, unknown>
    : undefined;
  const value = claims.active_org_id ?? claims.org_id ?? claims.organization_id ?? metadata?.active_org_id ?? metadata?.org_id;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

@Injectable()
export class MembershipContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.auth) return true;
    const memberships = await this.prisma.membership.findMany({
      where: { userId: request.auth.id, status: 'active', deletedAt: null },
      include: { propertyAssignments: { where: { deletedAt: null }, select: { propertyId: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (memberships.length === 0) throw new ForbiddenException('No active organization membership');

    const selectedOrg = activeOrgClaim(request);
    const membership = selectedOrg
      ? memberships.find((candidate) => candidate.orgId === selectedOrg)
      : memberships.length === 1 ? memberships[0] : undefined;
    if (!membership) throw new ForbiddenException(selectedOrg ? 'Active organization membership not found' : 'Token must identify an active organization');
    request.orgId = membership.orgId;
    request.membership = membership as MembershipContext;
    return true;
  }
}
