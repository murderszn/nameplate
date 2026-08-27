import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Stub — GET/POST /v1/parts, GET /v1/parts/:id/lineage per architecture.md §3. */
@Controller('v1/parts')
export class PartsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(
    @Query('orgId') orgId?: string,
    @Query('source_asset_id') sourceAssetId?: string,
    @Query('installed_in_asset_id') installedInAssetId?: string,
    @Query('status') status?: string,
  ) {
    return this.prisma.part.findMany({
      where: {
        ...(orgId ? { orgId } : {}),
        ...(sourceAssetId ? { sourceAssetId } : {}),
        ...(installedInAssetId ? { installedInAssetId } : {}),
        ...(status ? { status: status as any } : {}),
        deletedAt: null,
      },
    });
  }

  /**
   * Walks the lineage per data-model.md §5: source_asset_id → the
   * removal service event → forward through part_usage to
   * installed_in_asset_id. Simplified single-hop version for V0.
   */
  @Get(':id/lineage')
  async lineage(@Param('id') id: string) {
    const part = await this.prisma.part.findUnique({
      where: { id },
      include: {
        sourceAsset: true,
        installedInAsset: true,
        usages: { orderBy: { occurredAt: 'asc' } },
      },
    });
    return part;
  }

  @Post()
  create(@Body() body: any) {
    return this.prisma.part.create({ data: body });
  }
}
