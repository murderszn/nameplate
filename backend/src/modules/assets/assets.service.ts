import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import type { MembershipContext } from '../../auth/auth.types';
import { assignedPropertyIds, assertPropertyAccess } from '../../auth/context-access';

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
    propertyIds?: string[];
    globalScope?: boolean;
  }) {
    const { orgId, propertyId, status, categoryId, q, cursor, limit = 200, propertyIds, globalScope } =
      params;

    return this.prisma.asset.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(propertyId ? { currentPropertyId: propertyId } : !globalScope ? { currentPropertyId: { in: propertyIds ?? [] } } : {}),
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
      include: {
        category: true,
        assetModel: true,
        currentProperty: true,
        currentUnit: { include: { building: true } },
      },
    });
  }

  async findOne(id: string, orgId: string, membership?: MembershipContext) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, orgId, deletedAt: null, ...(!membership || ['owner', 'hq_admin', 'service_account'].includes(membership.role) ? {} : { currentPropertyId: { in: assignedPropertyIds(membership) ?? [] } }) },
      include: {
        category: true,
        assetModel: true,
        currentProperty: true,
        currentUnit: { include: { building: true } },
        serviceEvents: {
          orderBy: { occurredAt: 'desc' },
          include: {
            technician: { include: { user: true } },
            workOrder: true,
            partUsages: true,
          },
        },
        partsInstalled: true,
        partsSourced: true,
      },
    });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);
    return asset;
  }

  /**
   * GET /v1/assets/lookup?code= — the scan endpoint.
   * Resolves NPID, manufacturer serial (normalized), or a legacy
   * alt_identifier to an asset. See asset-tagging-strategy.md §8.3.
   */
  async lookup(code: string, orgId: string, membership?: MembershipContext) {
    const normalized = code.trim().toUpperCase();

    const byNpid = await this.prisma.asset.findFirst({
      where: {
        npid: normalized,
        orgId,
        deletedAt: null,
        ...(!membership || ['owner', 'hq_admin', 'service_account'].includes(membership.role)
          ? {}
          : { currentPropertyId: { in: assignedPropertyIds(membership) ?? [] } }),
      },
    });
    if (byNpid) return byNpid;

    const bySerial = await this.prisma.asset.findFirst({
      where: {
        orgId,
        ...(!membership || ['owner', 'hq_admin', 'service_account'].includes(membership.role) ? {} : { currentPropertyId: { in: assignedPropertyIds(membership) ?? [] } }),
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
        ...(!membership || ['owner', 'hq_admin', 'service_account'].includes(membership.role) ? {} : { currentPropertyId: { in: assignedPropertyIds(membership) ?? [] } }),
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

  create(dto: CreateAssetDto, orgId: string, membership: MembershipContext) {
    if (dto.currentPropertyId) assertPropertyAccess(membership, dto.currentPropertyId);
    return this.prisma.asset.create({
      data: {
        id: dto.id,
        orgId,
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

  async update(id: string, orgId: string, dto: UpdateAssetDto, membership: MembershipContext) {
    await this.findOne(id, orgId, membership);
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

  async retire(id: string, orgId: string, reason: string, membership: MembershipContext) {
    await this.findOne(id, orgId, membership);
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
