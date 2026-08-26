import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub — GET/POST /v1/buildings, GET /v1/buildings/:id,
 * GET /v1/buildings/:id/units per architecture.md §3.
 */
@Controller('v1/buildings')
export class BuildingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(
    @Query('orgId') orgId?: string,
    @Query('property_id') propertyId?: string,
  ) {
    return this.prisma.building.findMany({
      where: {
        deletedAt: null,
        ...(orgId ? { orgId } : {}),
        ...(propertyId ? { propertyId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.building.findUnique({ where: { id } });
  }

  @Get(':id/units')
  units(@Param('id') id: string) {
    return this.prisma.unit.findMany({ where: { buildingId: id } });
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.building.create({ data: body });
  }
}
