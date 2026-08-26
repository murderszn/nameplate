import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Stub — POST /v1/units, GET /v1/units/:id (includes current assets +
 * open work orders) per architecture.md §3.
 */
@Controller('v1/units')
export class UnitsController {
  constructor(private readonly prisma: PrismaService) {}

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
