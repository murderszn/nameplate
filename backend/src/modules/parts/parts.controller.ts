import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions } from '../../auth/permissions.decorator';

/** Stub — GET/POST /v1/parts, GET /v1/parts/:id/lineage per architecture.md §3. */
@Controller('v1/parts')
export class PartsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('parts:read')
  findAll(
    @CurrentOrg() orgId: string,
    @Query('source_asset_id') sourceAssetId?: string,
    @Query('installed_in_asset_id') installedInAssetId?: string,
    @Query('status') status?: string,
  ) {
    return this.prisma.part.findMany({
      where: {
        orgId,
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
  @RequirePermissions('parts:read')
  async lineage(@Param('id') id: string, @CurrentOrg() orgId: string) {
    const part = await this.prisma.part.findUnique({
      where: { id, orgId },
      include: {
        sourceAsset: true,
        installedInAsset: true,
        usages: { orderBy: { occurredAt: 'asc' } },
      },
    });
    return part;
  }

  @Post()
  @RequirePermissions('parts:write')
  create(@Body() body: any, @CurrentOrg() orgId: string) {
    const { orgId: _ignored, ...data } = body;
    return this.prisma.part.create({ data: { ...data, orgId } });
  }
}
