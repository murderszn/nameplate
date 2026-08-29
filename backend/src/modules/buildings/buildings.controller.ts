import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentMembership, CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions, RequirePropertyScope } from '../../auth/permissions.decorator';
import { assignedPropertyIds, assertPropertyAccess } from '../../auth/context-access';
import type { MembershipContext } from '../../auth/auth.types';

/**
 * Stub — GET/POST /v1/buildings, GET /v1/buildings/:id,
 * GET /v1/buildings/:id/units per architecture.md §3.
 */
@Controller('v1/buildings')
export class BuildingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('properties:read')
  findAll(
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Query('property_id') propertyId?: string,
  ) {
    if (propertyId) assertPropertyAccess(membership, propertyId);
    return this.prisma.building.findMany({
      where: {
        deletedAt: null,
        orgId,
        ...(propertyId ? { propertyId } : assignedPropertyIds(membership) ? { propertyId: { in: assignedPropertyIds(membership) } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  @RequirePermissions('properties:read')
  async findOne(@Param('id') id: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const building = await this.prisma.building.findFirst({ where: { id, orgId, deletedAt: null } });
    if (building) assertPropertyAccess(membership, building.propertyId);
    return building;
  }

  @Get(':id/units')
  @RequirePermissions('properties:read')
  async units(@Param('id') id: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const building = await this.prisma.building.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!building) return [];
    assertPropertyAccess(membership, building.propertyId);
    return this.prisma.unit.findMany({ where: { buildingId: id, orgId, deletedAt: null } });
  }

  @Post()
  @RequirePermissions('properties:manage')
  create(@Body() body: any, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const { orgId: _ignored, ...data } = body;
    assertPropertyAccess(membership, data.propertyId);
    return this.prisma.building.create({ data: { ...data, orgId } });
  }
}
