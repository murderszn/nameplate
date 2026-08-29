import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentMembership, CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { assignedPropertyIds, assertPropertyAccess } from '../../auth/context-access';
import type { MembershipContext } from '../../auth/auth.types';

/**
 * Stub — GET/POST /v1/work-orders, PATCH /v1/work-orders/:id,
 * POST /v1/work-orders/:id/assign, POST /v1/work-orders/:id/close
 * per architecture.md §3. Status-transition validation is deferred to a
 * dedicated domain service once auth/RBAC exists.
 */
@Controller('v1/work-orders')
export class WorkOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('work_orders:read')
  findAll(
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Query('status') status?: string,
    @Query('assignee') assignee?: string,
    @Query('property_id') propertyId?: string,
  ) {
    if (propertyId) assertPropertyAccess(membership, propertyId);
    return this.prisma.workOrder.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(propertyId ? { propertyId } : assignedPropertyIds(membership) ? { propertyId: { in: assignedPropertyIds(membership) } } : {}),
        ...(status ? { status: status as any } : {}),
        ...(assignee ? { assignedTo: assignee } : {}),
        ...(propertyId ? { propertyId } : {}),
      },
      orderBy: { slaDueAt: 'asc' },
    });
  }

  @Get(':id')
  @RequirePermissions('work_orders:read')
  async findOne(@Param('id') id: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, orgId, deletedAt: null, ...(assignedPropertyIds(membership) ? { propertyId: { in: assignedPropertyIds(membership) } } : {}) },
      include: { unit: true, asset: true, property: true, assignee: true },
    });
    return workOrder;
  }

  @Post()
  @RequirePermissions('work_orders:write')
  create(@Body() body: any, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const { orgId: _ignored, ...data } = body;
    assertPropertyAccess(membership, data.propertyId);
    return this.prisma.workOrder.create({ data: { ...data, orgId } });
  }

  @Patch(':id')
  @RequirePermissions('work_orders:write')
  async update(@Param('id') id: string, @Body() body: any, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const existing = await this.findScoped(id, orgId, membership);
    const { orgId: _ignored, propertyId: _propertyIgnored, ...data } = body;
    return this.prisma.workOrder.update({ where: { id: existing.id }, data });
  }

  @Post(':id/assign')
  @RequirePermissions('work_orders:write')
  async assign(@Param('id') id: string, @Body('assignedTo') assignedTo: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const existing = await this.findScoped(id, orgId, membership);
    return this.prisma.workOrder.update({
      where: { id: existing.id },
      data: { assignedTo, status: 'assigned' },
    });
  }

  @Post(':id/close')
  @RequirePermissions('work_orders:write')
  async close(@Param('id') id: string, @Body('resolution') resolution: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    const existing = await this.findScoped(id, orgId, membership);
    return this.prisma.workOrder.update({
      where: { id: existing.id },
      data: {
        status: 'completed',
        resolution: resolution as any,
        completedAt: new Date(),
      },
    });
  }

  private async findScoped(id: string, orgId: string, membership: MembershipContext) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, orgId, deletedAt: null, ...(assignedPropertyIds(membership) ? { propertyId: { in: assignedPropertyIds(membership) } } : {}) },
    });
    if (!workOrder) throw new Error(`WorkOrder ${id} not found`);
    return workOrder;
  }
}
