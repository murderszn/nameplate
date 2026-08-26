import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  findAll(
    @Query('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('assignee') assignee?: string,
    @Query('property_id') propertyId?: string,
  ) {
    return this.prisma.workOrder.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
        ...(assignee ? { assignedTo: assignee } : {}),
        ...(propertyId ? { propertyId } : {}),
      },
      orderBy: { slaDueAt: 'asc' },
    });
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.workOrder.create({ data: body });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.workOrder.update({ where: { id }, data: body });
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body('assignedTo') assignedTo: string) {
    return this.prisma.workOrder.update({
      where: { id },
      data: { assignedTo, status: 'assigned' },
    });
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body('resolution') resolution: string) {
    return this.prisma.workOrder.update({
      where: { id },
      data: {
        status: 'completed',
        resolution: resolution as any,
        completedAt: new Date(),
      },
    });
  }
}
