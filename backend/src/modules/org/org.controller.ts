import { Controller, Get } from '@nestjs/common';
import { CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub — GET /v1/org per architecture.md §3. Full auth-derived org context
 * is V1 work. For this single-tenant demo, calling with no `orgId` returns
 * the first (demo) organization so the HQ console can bootstrap without
 * already knowing an id.
 */
@Controller('v1/org')
export class OrgController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('org:read')
  findOne(@CurrentOrg() orgId: string) {
    return this.prisma.organization.findFirst({ where: { id: orgId, deletedAt: null } });
  }

  @Get('all')
  @RequirePermissions('org:read')
  findAll(@CurrentOrg() orgId: string) {
    return this.prisma.organization.findMany({ where: { id: orgId, deletedAt: null } });
  }
}
