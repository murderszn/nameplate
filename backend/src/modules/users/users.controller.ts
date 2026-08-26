import { Controller, Get, Query } from '@nestjs/common';
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
  async me(@Query('userId') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { propertyAssignments: true },
        },
      },
    });
    return user;
  }
}
