import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceEventDto } from './dto/create-service-event.dto';
import { UpdateServiceEventDto } from './dto/update-service-event.dto';
import type { MembershipContext } from '../../auth/auth.types';
import { assignedPropertyIds, assertPropertyAccess } from '../../auth/context-access';

@Injectable()
export class ServiceEventsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /v1/service-events ?asset_id= &technician_id= &from= &to= */
  findAll(params: {
    orgId: string;
    assetId?: string;
    technicianId?: string;
    from?: string;
    to?: string;
    propertyIds?: string[];
    globalScope?: boolean;
  }) {
    const { orgId, assetId, technicianId, from, to, propertyIds, globalScope } = params;
    return this.prisma.serviceEvent.findMany({
      where: {
        orgId,
        ...(!globalScope ? { propertyId: { in: propertyIds ?? [] } } : {}),
        ...(assetId ? { assetId } : {}),
        ...(technicianId ? { technicianId } : {}),
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string, membership?: MembershipContext) {
    const event = await this.prisma.serviceEvent.findFirst({
      where: { id, orgId },
      include: { partUsages: true },
    });
    if (!event) throw new NotFoundException(`ServiceEvent ${id} not found`);
    if (membership && event.propertyId) assertPropertyAccess(membership, event.propertyId);
    return event;
  }

  /**
   * Creates the service event and its part usages in a single
   * transaction — architecture.md §2 "a service event + part usages +
   * asset status change + work-order close must all commit or none do."
   * Asset status/work-order transitions are intentionally left for the
   * respective domain services once they exist; this covers the
   * event + part-usages half of that invariant.
   */
  async create(dto: CreateServiceEventDto, orgId: string, membership: MembershipContext) {
    const asset = await this.prisma.asset.findFirst({ where: { id: dto.assetId, orgId, deletedAt: null }, select: { currentPropertyId: true } });
    if (!asset) throw new NotFoundException(`Asset ${dto.assetId} not found`);
    if (asset.currentPropertyId) assertPropertyAccess(membership, asset.currentPropertyId);
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.serviceEvent.create({
        data: {
          id: dto.id,
          orgId,
          assetId: dto.assetId,
          workOrderId: dto.workOrderId,
          technicianId: membership.id,
          eventType: dto.eventType as any,
          findings: dto.findings,
          symptomCodes: dto.symptomCodes ?? [],
          laborMinutes: dto.laborMinutes,
          laborRate: dto.laborRate,
          occurredAt: new Date(dto.occurredAt),
        },
      });

      if (dto.partUsages?.length) {
        await tx.partUsage.createMany({
          data: dto.partUsages.map((pu) => ({
            id: crypto.randomUUID(),
            orgId,
            serviceEventId: event.id,
            assetId: dto.assetId,
            partId: pu.partId,
            partCatalogId: pu.partCatalogId,
            action: pu.action,
            quantity: pu.quantity ?? 1,
            unitCost: pu.unitCost ?? 0,
            occurredAt: new Date(dto.occurredAt),
          })),
        });
      }

      return tx.serviceEvent.findUniqueOrThrow({
        where: { id: event.id },
        include: { partUsages: true },
      });
    });
  }

  async update(id: string, orgId: string, dto: UpdateServiceEventDto, membership: MembershipContext) {
    await this.findOne(id, orgId, membership);
    return this.prisma.serviceEvent.update({
      where: { id },
      data: {
        findings: dto.findings,
        resolutionCode: dto.resolutionCode as any,
      },
    });
  }
}
