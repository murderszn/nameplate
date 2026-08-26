import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
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
  findAll(@Query('orgId') orgId: string, @Query('q') q?: string) {
    return this.prisma.property.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.property.findUnique({ where: { id } });
  }

  @Get(':id/buildings')
  buildings(@Param('id') id: string) {
    return this.prisma.building.findMany({ where: { propertyId: id } });
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.property.create({ data: body });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.property.update({ where: { id }, data: body });
  }
}
