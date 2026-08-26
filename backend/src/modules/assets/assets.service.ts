import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /v1/assets ?property_id= &status= &category= &q= &cursor= */
  findAll(params: {
    orgId: string;
    propertyId?: string;
    status?: string;
    categoryId?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }) {
    const { orgId, propertyId, status, categoryId, q, cursor, limit = 50 } =
      params;

    return this.prisma.asset.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(propertyId ? { currentPropertyId: propertyId } : {}),
        ...(status ? { status: status as any } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(q
          ? {
              OR: [
                { npid: { contains: q, mode: 'insensitive' } },
                { serialNumber: { contains: q, mode: 'insensitive' } },
                { manufacturerRaw: { contains: q, mode: 'insensitive' } },
                { modelRaw: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, orgId, deletedAt: null },
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  /**
   * GET /v1/assets/lookup?code= — the scan endpoint.
   * Resolves NPID, manufacturer serial (normalized), or a legacy
   * alt_identifier to an asset. See asset-tagging-strategy.md §8.3.
   */
  async lookup(code: string, orgId: string) {
    const normalized = code.trim().toUpperCase();

    const byNpid = await this.prisma.asset.findFirst({
      where: { npid: normalized, deletedAt: null },
    });
    if (byNpid) return byNpid;

    const bySerial = await this.prisma.asset.findFirst({
      where: {
        orgId,
        serialNormalized: normalized.replace(/[^A-Z0-9]/g, ''),
        deletedAt: null,
      },
    });
    if (bySerial) return bySerial;

    // alt_identifiers is a jsonb array of {type, value} — fall back to a
    // simple contains check for V0; a GIN index query replaces this later.
    const byAlt = await this.prisma.asset.findFirst({
      where: {
        orgId,
        deletedAt: null,
        altIdentifiers: {
          array_contains: [{ value: code }],
        } as any,
      },
    });
    if (byAlt) return byAlt;

    throw new NotFoundException(
      `No asset resolves for code "${code}" (checked NPID, serial, alt_identifiers)`,
    );
  }

  create(dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: {
        id: dto.id,
        orgId: dto.orgId,
        npid: dto.npid,
        categoryId: dto.categoryId,
        assetModelId: dto.assetModelId,
        manufacturerRaw: dto.manufacturerRaw,
        modelRaw: dto.modelRaw,
        serialNumber: dto.serialNumber,
        serialConfidence: (dto.serialConfidence as any) ?? 'absent',
        currentUnitId: dto.currentUnitId,
        currentPropertyId: dto.currentPropertyId,
        currentLocationType: dto.currentUnitId ? 'unit' : 'unknown',
        purchaseCost: dto.purchaseCost,
      },
    });
  }

  async update(id: string, orgId: string, dto: UpdateAssetDto) {
    await this.findOne(id, orgId);
    return this.prisma.asset.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        assetModelId: dto.assetModelId,
        manufacturerRaw: dto.manufacturerRaw,
        modelRaw: dto.modelRaw,
        serialNumber: dto.serialNumber,
        serialConfidence: dto.serialConfidence as any,
        purchaseCost: dto.purchaseCost,
      },
    });
  }

  /**
   * POST /v1/assets/:id/move is deliberately NOT here — it belongs to a
   * future AssetLocation ledger service once that table is modeled. This
   * stub exists so the "location is never a silent field update" rule
   * (architecture.md §3, v0-scope.md non-negotiable #2) is visible from
   * the service layer itself.
   */
  async move(): Promise<never> {
    throw new Error(
      'Not implemented: requires the asset_location ledger table (deferred in this scaffold). ' +
        'See docs/data-model.md §3 "asset_location".',
    );
  }

  async retire(id: string, orgId: string, reason: string) {
    await this.findOne(id, orgId);
    return this.prisma.asset.update({
      where: { id },
      data: {
        status: 'retired',
        retiredAt: new Date(),
        retiredReason: reason as any,
      },
    });
  }
}
