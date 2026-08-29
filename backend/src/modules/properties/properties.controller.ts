import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentMembership, CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions, RequirePropertyScope } from '../../auth/permissions.decorator';
import { assignedPropertyIds } from '../../auth/context-access';
import type { MembershipContext } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub CRUD — GET/POST /v1/properties, GET /v1/properties/:id,
 * PATCH /v1/properties/:id, GET /v1/properties/:id/buildings
 * per architecture.md §3. Basic Prisma passthrough; validation DTOs and
 * auth/org-scope guards land alongside the auth module.
 */
@Controller('v1/properties')
export class PropertiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('properties:read')
  findAll(@CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext, @Query('q') q?: string) {
    const propertyIds = assignedPropertyIds(membership);
    return this.prisma.property.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(propertyIds ? { id: { in: propertyIds } } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
    });
  }

  @Get(':id')
  @RequirePermissions('properties:read')
  @RequirePropertyScope('id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.prisma.property.findFirst({ where: { id, orgId, deletedAt: null } });
  }

  @Get(':id/buildings')
  @RequirePermissions('properties:read')
  @RequirePropertyScope('id')
  buildings(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.prisma.building.findMany({ where: { propertyId: id, orgId, deletedAt: null } });
  }

  @Post()
  @RequirePermissions('properties:manage')
  create(@Body() body: any, @CurrentOrg() orgId: string) {
    const { orgId: _ignored, ...data } = body;
    return this.prisma.property.create({ data: { ...data, orgId } });
  }

  @Patch(':id')
  @RequirePermissions('properties:manage')
  @RequirePropertyScope('id')
  update(@Param('id') id: string, @Body() body: any, @CurrentOrg() orgId: string) {
    const { orgId: _ignored, ...data } = body;
    return this.prisma.property.update({ where: { id, orgId }, data });
  }
}
