import { Controller, Get } from '@nestjs/common';
import { CurrentOrg, CurrentUser } from '../../auth/current-context.decorator';
import { RequirePermissions } from '../../auth/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub — GET /v1/me per architecture.md §3 ("user, role, org, assigned
 * properties"). Real implementation resolves from the JWT once the auth
 * module lands; this queries by userId for scaffold purposes.
 */
@Controller('v1')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @RequirePermissions('org:read')
  async me(@CurrentUser() authUser: AuthenticatedUser, @CurrentOrg() orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        memberships: {
          where: { orgId, status: 'active', deletedAt: null },
          include: { propertyAssignments: true },
        },
      },
    });
    return user;
  }
}
