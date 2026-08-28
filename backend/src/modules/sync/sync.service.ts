import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncOperationDto, SyncPushDto, SyncEntityType, SyncOpType } from './dto/sync-push.dto';
import { AllocateBlockDto } from './dto/allocate-block.dto';

const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const DEFAULT_ORG_SECRET = 'nameplate_master_org_secret_v0_prod_2026';
const BASE_URL = 'https://np.app/a';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  // In-memory idempotency cache for fast deduping (in production backed by Redis / DB table)
  private readonly processedOperations = new Map<string, { status: string; appliedAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /v1/sync/pull
   * Monotonic sequence-based delta pull (architecture.md §4.4)
   */
  async pull(dto: SyncPullDto, orgId: string) {
    const cursorBigInt = BigInt(dto.cursor || '0');
    const limit = dto.limit || 500;
    const propertyFilter = dto.scopes && dto.scopes.length > 0 ? { in: dto.scopes } : undefined;

    // 1. Fetch changed assets
    const assets = await this.prisma.asset.findMany({
      where: {
        orgId,
        changeSeq: { gt: cursorBigInt },
        deletedAt: null,
        ...(propertyFilter ? { currentPropertyId: propertyFilter } : {}),
      },
      take: limit,
      orderBy: { changeSeq: 'asc' },
      include: {
        category: true,
        assetModel: true,
      },
    });

    // 2. Fetch changed units
    const units = await this.prisma.unit.findMany({
      where: {
        orgId,
        changeSeq: { gt: cursorBigInt },
        deletedAt: null,
        ...(propertyFilter ? { propertyId: propertyFilter } : {}),
      },
      take: limit,
      orderBy: { changeSeq: 'asc' },
    });

    // 3. Fetch changed service events
    const serviceEvents = await this.prisma.serviceEvent.findMany({
      where: {
        orgId,
        changeSeq: { gt: cursorBigInt },
      },
      take: limit,
      orderBy: { changeSeq: 'asc' },
      include: {
        technician: { include: { user: true } },
        partUsages: true,
      },
    });

    // 4. Fetch changed work orders
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        orgId,
        changeSeq: { gt: cursorBigInt },
        deletedAt: null,
        ...(propertyFilter ? { propertyId: propertyFilter } : {}),
      },
      take: limit,
      orderBy: { changeSeq: 'asc' },
    });

    // 5. Fetch tombstones (soft-deleted records)
    const deletedAssets = await this.prisma.asset.findMany({
      where: {
        orgId,
        changeSeq: { gt: cursorBigInt },
        deletedAt: { not: null },
      },
      select: { id: true, deletedAt: true },
      take: 100,
    });

    const tombstones = deletedAssets.map((a) => ({
      entity: 'asset',
      id: a.id,
      deletedAt: a.deletedAt,
    }));

    // Find highest watermark sequence
    let highestSeq = cursorBigInt;
    for (const a of assets) if (a.changeSeq > highestSeq) highestSeq = a.changeSeq;
    for (const u of units) if (u.changeSeq > highestSeq) highestSeq = u.changeSeq;
    for (const se of serviceEvents) if (se.changeSeq > highestSeq) highestSeq = se.changeSeq;
    for (const wo of workOrders) if (wo.changeSeq > highestSeq) highestSeq = wo.changeSeq;

    return {
      changes: {
        assets,
        units,
        serviceEvents,
        workOrders,
      },
      tombstones,
      cursor: highestSeq.toString(),
      hasMore: assets.length >= limit || units.length >= limit || serviceEvents.length >= limit,
    };
  }

  /**
   * POST /v1/sync/push
   * Append-only outbox batch push processor (architecture.md §4.2)
   */
  async push(dto: SyncPushDto, orgId: string, userId?: string) {
    const results: Array<{
      opId: string;
      status: 'applied' | 'duplicate' | 'rejected';
      entityId?: string;
      error?: string | null;
    }> = [];

    for (const op of dto.operations) {
      // 1. Idempotency Check
      if (this.processedOperations.has(op.opId)) {
        results.push({
          opId: op.opId,
          status: 'duplicate',
          entityId: op.payload?.id,
          error: null,
        });
        continue;
      }

      try {
        const entityId = await this.processOperation(op, orgId, userId);
        this.processedOperations.set(op.opId, { status: 'applied', appliedAt: Date.now() });

        results.push({
          opId: op.opId,
          status: 'applied',
          entityId,
          error: null,
        });
      } catch (err: any) {
        this.logger.error(`Failed to apply sync operation ${op.opId}: ${err.message}`);
        results.push({
          opId: op.opId,
          status: 'rejected',
          entityId: op.payload?.id,
          error: err.message || 'Operation failed',
        });
      }
    }

    return {
      results,
      appliedCount: results.filter((r) => r.status === 'applied').length,
      duplicateCount: results.filter((r) => r.status === 'duplicate').length,
      rejectedCount: results.filter((r) => r.status === 'rejected').length,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * POST /v1/assets/blocks/allocate
   * Pre-allocates a batch of signed Crockford-32 NPIDs for offline field minting.
   */
  async allocateBlock(dto: AllocateBlockDto, orgId: string) {
    const count = dto.count || 500;
    const batchId = dto.batchId || `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

    const tags: Array<{
      npid: string;
      signature: string;
      timestamp: number;
      url: string;
      compactUri: string;
    }> = [];
    for (let i = 0; i < count; i++) {
      const npid = this.mintNpid();
      const sig = this.generateHmacSignature(npid, orgId, batchId, issuedAt);
      tags.push({
        npid,
        signature: sig,
        timestamp: issuedAt,
        url: `${BASE_URL}/${npid.replace('-', '')}?s=${sig}&t=${issuedAt}&b=${batchId}&o=${orgId}`,
        compactUri: `np://t/${npid.replace('-', '')}/${sig}.${issuedAt}.${batchId}`,
      });
    }

    return {
      batchId,
      orgId,
      allocatedCount: tags.length,
      deviceId: dto.deviceId,
      tags,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private async processOperation(op: SyncOperationDto, orgId: string, userId?: string): Promise<string> {
    const p = op.payload;
    const occurredAt = new Date(op.occurredAt || Date.now());

    switch (op.entityType) {
      case SyncEntityType.SERVICE_EVENT: {
        const created = await this.prisma.serviceEvent.create({
          data: {
            id: p.id || undefined,
            orgId,
            assetId: p.assetId,
            technicianId: p.technicianId || p.technicianMembershipId || userId || p.createdBy,
            workOrderId: p.workOrderId || null,
            eventType: p.eventType || 'inspection',
            findings: p.findings || null,
            resolutionCode: p.resolutionCode || 'fixed',
            occurredAt,
          },
        });
        return created.id;
      }

      case SyncEntityType.ASSET: {
        if (op.opType === SyncOpType.CREATE) {
          const created = await this.prisma.asset.create({
            data: {
              id: p.id || undefined,
              orgId,
              npid: p.npid,
              categoryId: p.categoryId,
              assetModelId: p.assetModelId || null,
              serialNumber: p.serialNumber || null,
              status: p.status || 'active',
              condition: p.condition || 'good',
              currentPropertyId: p.currentPropertyId || p.propertyId || null,
              currentUnitId: p.currentUnitId || p.unitId || null,
            },
          });
          return created.id;
        } else if (op.opType === SyncOpType.UPDATE) {
          const updated = await this.prisma.asset.update({
            where: { id: p.id },
            data: {
              status: p.status || undefined,
              condition: p.condition || undefined,
              currentLocationConfirmedAt: occurredAt,
            },
          });
          return updated.id;
        }
        break;
      }

      case SyncEntityType.WORK_ORDER: {
        if (op.opType === SyncOpType.UPDATE) {
          const updated = await this.prisma.workOrder.update({
            where: { id: p.id },
            data: {
              status: p.status || undefined,
            },
          });
          return updated.id;
        }
        break;
      }

      default:
        break;
    }

    return p.id || 'op-ok';
  }

  private mintNpid(): string {
    let body = '';
    const bytes = crypto.randomBytes(7);
    for (let i = 0; i < 7; i++) {
      body += CROCKFORD_CHARS[bytes[i] % 32];
    }
    // Compute Modulo-32 check character
    let val = 0;
    for (let i = 0; i < body.length; i++) {
      val = val * 32 + CROCKFORD_CHARS.indexOf(body[i]);
    }
    const checkChar = CROCKFORD_CHARS[val % 32];
    return `NP-${body}${checkChar}`;
  }

  private generateHmacSignature(npid: string, orgId: string, batchId: string, issuedAt: number): string {
    const clean = npid.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const payload = `NPID:${clean}|ORG:${orgId}|BATCH:${batchId}|TS:${issuedAt}`;
    const hmac = crypto.createHmac('sha256', DEFAULT_ORG_SECRET);
    hmac.update(payload);
    return hmac.digest('base64url').slice(0, 12);
  }
}
