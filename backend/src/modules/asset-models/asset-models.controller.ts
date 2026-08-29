import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { CurrentOrg } from '../../auth/current-context.decorator';

/**
 * Stub — GET/POST /v1/asset-models, the crowd-populated catalog
 * per architecture.md §3 and asset-tagging-strategy.md §6.4.
 * Fuzzy trigram search is deferred; this does a simple contains match.
 */
@Controller('v1/asset-models')
export class AssetModelsController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /v1/asset-models/categories — the category lookup (system + org-extended). */
  @Get('categories')
  @RequirePermissions('assets:read')
  categories(@CurrentOrg() orgId: string) {
    return this.prisma.assetCategory.findMany({ where: { OR: [{ orgId: null }, { orgId }] }, orderBy: { sortOrder: 'asc' } });
  }

  @Get()
  @RequirePermissions('assets:read')
  findAll(@Query('manufacturer') manufacturer?: string, @Query('q') q?: string) {
    return this.prisma.assetModel.findMany({
      where: {
        ...(manufacturer ? { manufacturer: { equals: manufacturer, mode: 'insensitive' } } : {}),
        ...(q
          ? {
              OR: [
                { manufacturer: { contains: q, mode: 'insensitive' } },
                { modelNumber: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
  }

  @Post()
  @RequirePermissions('assets:write')
  create(@Body() body: any) {
    return this.prisma.assetModel.create({ data: body });
  }
}
