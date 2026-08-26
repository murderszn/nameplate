import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  categories() {
    return this.prisma.assetCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  @Get()
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
  create(@Body() body: any) {
    return this.prisma.assetModel.create({ data: body });
  }
}
