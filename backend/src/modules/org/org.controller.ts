import { Controller, Get, Query } from '@nestjs/common';
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
  findOne(@Query('orgId') orgId?: string) {
    if (orgId) {
      return this.prisma.organization.findUnique({ where: { id: orgId } });
    }
    return this.prisma.organization.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Get('all')
  findAll() {
    return this.prisma.organization.findMany({ where: { deletedAt: null } });
  }
}
