import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentOrg, CurrentUser } from '../../auth/current-context.decorator';
import { CurrentMembership } from '../../auth/current-context.decorator';
import { RequirePermissions } from '../../auth/permissions.decorator';
import type { AuthenticatedUser, MembershipContext } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';
import { UsersService } from './users.service';

/**
 * Stub — GET /v1/me per architecture.md §3 ("user, role, org, assigned
 * properties"). Real implementation resolves from the JWT once the auth
 * module lands; this queries by userId for scaffold purposes.
 */
@Controller('v1')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

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

  @Get('users')
  @RequirePermissions('users:read')
  list(
    @CurrentOrg() orgId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentMembership() membership: MembershipContext,
  ) {
    return this.usersService.list(orgId, actor, membership);
  }

  @Post('users/invite')
  @RequirePermissions('users:manage')
  invite(
    @CurrentOrg() orgId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentMembership() membership: MembershipContext,
    @Body() dto: InviteUserDto,
  ) {
    return this.usersService.invite(orgId, actor, membership, dto);
  }

  @Patch('users/:membershipId')
  @RequirePermissions('users:manage')
  update(
    @Param('membershipId') membershipId: string,
    @CurrentOrg() orgId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @CurrentMembership() membership: MembershipContext,
    @Body() dto: UpdateUserAccessDto,
  ) {
    return this.usersService.update(membershipId, orgId, actor, membership, dto);
  }
}
