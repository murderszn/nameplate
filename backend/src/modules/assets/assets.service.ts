import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantTransactionService } from '../../auth/tenant-transaction.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { MoveAssetDto } from './dto/move-asset.dto';
import type { MembershipContext } from '../../auth/auth.types';
import { assignedPropertyIds, assertPropertyAccess } from '../../auth/context-access';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantTransactions: TenantTransactionService,
  ) {}

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
   * Close the current custody interval, append the next interval, update the
   * asset projection, and write an audit fact in one tenant-scoped transaction.
   */
  async move(
    id: string,
    orgId: string,
    dto: MoveAssetDto,
    membership: MembershipContext,
  ) {
    const occurredAt = new Date(dto.occurredAt);

    try {
      return await this.tenantTransactions.withTenant(
        {
          orgId,
          userId: membership.userId,
          membershipId: membership.id,
        },
        async (tx) => {
          const replay = await tx.assetLocation.findFirst({
            where: {
              id: dto.id,
              orgId,
              assetId: id,
              createdBy: membership.userId,
            },
          });
          if (replay) {
            return {
              asset: await tx.asset.findUniqueOrThrow({ where: { id } }),
              location: replay,
              idempotentReplay: true,
            };
          }

          const assetScope = ['owner', 'hq_admin', 'service_account'].includes(membership.role)
            ? {}
            : { currentPropertyId: { in: assignedPropertyIds(membership) ?? [] } };
          const asset = await tx.asset.findFirst({
            where: { id, orgId, deletedAt: null, ...assetScope },
            select: {
              id: true,
              currentLocationType: true,
              currentUnitId: true,
              currentStorageLocationId: true,
              currentPropertyId: true,
              currentLocationSince: true,
            },
          });
          if (!asset) throw new NotFoundException(`Asset ${id} not found`);

          const destination = await this.resolveMoveDestination(tx, dto, orgId, membership);
          const openLocation = await tx.assetLocation.findFirst({
            where: { orgId, assetId: id, toTs: null },
            select: { id: true, fromTs: true },
          });
          if (openLocation && occurredAt <= openLocation.fromTs) {
            throw new BadRequestException(
              'occurredAt must be later than the current custody interval start',
            );
          }

          if (openLocation) {
            await tx.assetLocation.updateMany({
              where: { id: openLocation.id, orgId, assetId: id, toTs: null },
              data: { toTs: occurredAt },
            });
          }

          const location = await tx.assetLocation.create({
            data: {
              id: dto.id,
              orgId,
              assetId: id,
              locationType: dto.locationType as any,
              unitId: destination.unitId,
              storageLocationId: destination.storageLocationId,
              vendorId: destination.vendorId,
              propertyId: destination.propertyId,
              fromTs: occurredAt,
              moveReason: dto.moveReason as any,
              movementKind: (dto.movementKind as any) ?? 'recorded',
              confirmedBy: membership.userId,
              confirmationMethod: dto.confirmationMethod as any,
              scanLatitude: dto.scanLatitude,
              scanLongitude: dto.scanLongitude,
              scanAccuracyM: dto.scanAccuracyM,
              workOrderId: dto.workOrderId,
              serviceEventId: dto.serviceEventId,
              turnId: dto.turnId,
              notes: dto.notes,
              occurredAt,
              createdBy: membership.userId,
              deviceId: dto.deviceId,
            },
          });

          const updatedAsset = await tx.asset.update({
            where: { id },
            data: {
              currentLocationType: dto.locationType as any,
              currentUnitId: destination.unitId,
              currentStorageLocationId: destination.storageLocationId,
              currentPropertyId: destination.propertyId,
              currentLocationSince: occurredAt,
              currentLocationConfirmedAt: occurredAt,
              currentLocationConfirmedBy: membership.userId,
              updatedBy: membership.userId,
            },
          });

          await tx.auditLog.create({
            data: {
              orgId,
              actorUserId: membership.userId,
              actorRole: membership.role as any,
              deviceId: dto.deviceId,
              action: 'asset.moved',
              entityType: 'asset',
              entityId: id,
              before: {
                locationType: asset.currentLocationType,
                unitId: asset.currentUnitId,
                storageLocationId: asset.currentStorageLocationId,
                propertyId: asset.currentPropertyId,
                since: asset.currentLocationSince?.toISOString() ?? null,
              },
              after: {
                locationId: location.id,
                locationType: dto.locationType,
                unitId: destination.unitId,
                storageLocationId: destination.storageLocationId,
                vendorId: destination.vendorId,
                propertyId: destination.propertyId,
                since: occurredAt.toISOString(),
              },
              occurredAt,
            },
          });

          return { asset: updatedAsset, location, idempotentReplay: false };
        },
      );
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(
          'The move conflicts with an existing custody interval or operation id',
        );
      }
      throw error;
    }
  }

  private async resolveMoveDestination(
    tx: Prisma.TransactionClient,
    dto: MoveAssetDto,
    orgId: string,
    membership: MembershipContext,
  ): Promise<{
    unitId: string | null;
    storageLocationId: string | null;
    vendorId: string | null;
    propertyId: string | null;
  }> {
    const suppliedTargets = [dto.unitId, dto.storageLocationId, dto.vendorId].filter(Boolean);
    if (suppliedTargets.length > 1) {
      throw new BadRequestException('A move may specify only one destination target');
    }

    let unitId: string | null = null;
    let storageLocationId: string | null = null;
    let vendorId: string | null = null;
    let propertyId: string | null = dto.propertyId ?? null;

    if (dto.locationType === 'unit') {
      if (!dto.unitId || suppliedTargets.length !== 1) {
        throw new BadRequestException('unit locationType requires unitId only');
      }
      const unit = await tx.unit.findFirst({
        where: { id: dto.unitId, orgId, deletedAt: null },
        select: { id: true, propertyId: true },
      });
      if (!unit) throw new NotFoundException(`Unit ${dto.unitId} not found`);
      if (dto.propertyId && dto.propertyId !== unit.propertyId) {
        throw new BadRequestException('propertyId does not match the destination unit');
      }
      assertPropertyAccess(membership, unit.propertyId);
      unitId = unit.id;
      propertyId = unit.propertyId;
    } else if (dto.locationType === 'storage') {
      if (!dto.storageLocationId || suppliedTargets.length !== 1) {
        throw new BadRequestException('storage locationType requires storageLocationId only');
      }
      const storage = await tx.storageLocation.findFirst({
        where: { id: dto.storageLocationId, orgId, deletedAt: null },
        select: { id: true, propertyId: true },
      });
      if (!storage) {
        throw new NotFoundException(`Storage location ${dto.storageLocationId} not found`);
      }
      if (dto.propertyId && dto.propertyId !== storage.propertyId) {
        throw new BadRequestException('propertyId does not match the destination storage location');
      }
      if (storage.propertyId) assertPropertyAccess(membership, storage.propertyId);
      storageLocationId = storage.id;
      propertyId = storage.propertyId;
    } else if (dto.locationType === 'vendor') {
      if (!dto.vendorId || suppliedTargets.length !== 1) {
        throw new BadRequestException('vendor locationType requires vendorId only');
      }
      const vendor = await tx.vendor.findFirst({
        where: { id: dto.vendorId, orgId, active: true },
        select: { id: true },
      });
      if (!vendor) throw new NotFoundException(`Vendor ${dto.vendorId} not found`);
      vendorId = vendor.id;
    } else if (suppliedTargets.length) {
      throw new BadRequestException(
        `${dto.locationType} locationType cannot include a unit, storage, or vendor target`,
      );
    }

    if (propertyId) {
      assertPropertyAccess(membership, propertyId);
      const property = await tx.property.findFirst({
        where: { id: propertyId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!property) throw new NotFoundException(`Property ${propertyId} not found`);
    }

    return { unitId, storageLocationId, vendorId, propertyId };
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
