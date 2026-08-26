import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Stub — POST /v1/buildings, GET /v1/buildings/:id/units per architecture.md §3. */
@Controller('v1/buildings')
export class BuildingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/units')
  units(@Param('id') id: string) {
    return this.prisma.unit.findMany({ where: { buildingId: id } });
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.building.create({ data: body });
  }
}
