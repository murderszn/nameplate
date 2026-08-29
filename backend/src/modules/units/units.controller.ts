import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentMembership, CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { assignedPropertyIds, assertPropertyAccess } from '../../auth/context-access';
import type { MembershipContext } from '../../auth/auth.types';

/**
 * Stub — GET/POST /v1/units, GET /v1/units/:id (includes current assets +
 * open work orders) per architecture.md §3.
 */
@Controller('v1/units')
export class UnitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('properties:read')
  findAll(
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Query('property_id') propertyId?: string,
    @Query('building_id') buildingId?: string,
  ) {
    if (propertyId) assertPropertyAccess(membership, propertyId);
    return this.prisma.unit.findMany({
      where: {
        deletedAt: null,
        orgId,
        ...(propertyId ? { propertyId } : assignedPropertyIds(membership) ? { propertyId: { in: assignedPropertyIds(membership) } } : {}),
        ...(buildingId ? { buildingId } : {}),
      },
      orderBy: { label: 'asc' },
    });
  }

  @Get(':id')
  @RequirePermissions('properties:read')
  async findOne(@Param('id') id: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        assets: { where: { deletedAt: null } },
        workOrders: { where: { status: { notIn: ['completed', 'cancelled'] } } },
      },
    });
    if (unit) assertPropertyAccess(membership, unit.propertyId);
    return unit;
  }

  @Post()
  @RequirePermissions('properties:manage')
  create(@Body() body: any, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const { orgId: _ignored, ...data } = body;
    assertPropertyAccess(membership, data.propertyId);
    return this.prisma.unit.create({ data: { ...data, orgId } });
  }
}
