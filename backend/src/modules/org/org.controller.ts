import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Stub — GET /v1/org per architecture.md §3. Full auth-derived org context is V1 work. */
@Controller('v1/org')
export class OrgController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findOne(@Query('orgId') orgId: string) {
    return this.prisma.organization.findUnique({ where: { id: orgId } });
  }
}
