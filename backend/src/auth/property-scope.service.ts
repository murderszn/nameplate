import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { roleHasGlobalPropertyScope } from './role-permissions';
import type { MembershipContext } from './auth.types';

@Injectable()
export class PropertyScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanAccessProperty(membership: MembershipContext, propertyId: string): Promise<void> {
    if (roleHasGlobalPropertyScope(membership.role)) return;
    const assignment = await this.prisma.propertyAssignment.findFirst({
      where: { membershipId: membership.id, propertyId, orgId: membership.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenException('Property is outside the membership scope');
  }
}
