import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub — GET/POST /v1/units, GET /v1/units/:id (includes current assets +
 * open work orders) per architecture.md §3.
 */
@Controller('v1/units')
export class UnitsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(
    @Query('orgId') orgId?: string,
    @Query('property_id') propertyId?: string,
    @Query('building_id') buildingId?: string,
  ) {
    return this.prisma.unit.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { orgId } : {}),
        ...(propertyId ? { propertyId } : {}),
        ...(buildingId ? { buildingId } : {}),
      },
      orderBy: { label: 'asc' },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.unit.findUnique({
      where: { id },
      include: {
        assets: { where: { deletedAt: null } },
        workOrders: { where: { status: { notIn: ['completed', 'cancelled'] } } },
      },
    });
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.unit.create({ data: body });
  }
}
