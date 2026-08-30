import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AssetsService } from './assets.service';
import type { MembershipContext } from '../../auth/auth.types';

describe('AssetsService custody moves', () => {
  const membership: MembershipContext = {
    id: '11111111-1111-4111-8111-111111111111',
    orgId: '22222222-2222-4222-8222-222222222222',
    userId: '33333333-3333-4333-8333-333333333333',
    role: 'technician',
    status: 'active',
    propertyAssignments: [{ propertyId: '44444444-4444-4444-8444-444444444444' }],
  };
  const assetId = '55555555-5555-4555-8555-555555555555';
  const moveId = '66666666-6666-4666-8666-666666666666';
  const unitId = '77777777-7777-4777-8777-777777777777';
  const occurredAt = '2026-08-29T18:00:00.000Z';

  let tx: any;
  let service: AssetsService;

  beforeEach(() => {
    tx = {
      asset: {
        findFirst: jest.fn().mockResolvedValue({
          id: assetId,
          currentLocationType: 'storage',
          currentUnitId: null,
          currentStorageLocationId: '88888888-8888-4888-8888-888888888888',
          currentPropertyId: membership.propertyAssignments?.[0].propertyId,
          currentLocationSince: new Date('2026-08-28T18:00:00.000Z'),
        }),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn().mockImplementation(({ data }: any) => ({ id: assetId, ...data })),
      },
      assetLocation: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: '99999999-9999-4999-8999-999999999999',
            fromTs: new Date('2026-08-28T18:00:00.000Z'),
          }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockImplementation(({ data }: any) => ({ ...data })),
      },
      unit: {
        findFirst: jest.fn().mockResolvedValue({
          id: unitId,
          propertyId: membership.propertyAssignments?.[0].propertyId,
        }),
      },
      storageLocation: { findFirst: jest.fn() },
      vendor: { findFirst: jest.fn() },
      property: { findFirst: jest.fn().mockResolvedValue({ id: membership.propertyAssignments?.[0].propertyId }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const tenantTransactions = {
      withTenant: jest.fn().mockImplementation((_context, work) => work(tx)),
    };
    service = new AssetsService({} as any, tenantTransactions as any);
  });

  it('closes the open interval and appends custody, projection, and audit rows atomically', async () => {
    const result = await service.move(
      assetId,
      membership.orgId,
      {
        id: moveId,
        locationType: 'unit',
        unitId,
        moveReason: 'relocation',
        confirmationMethod: 'qr_scan',
        occurredAt,
      },
      membership,
    );

    expect(tx.assetLocation.updateMany).toHaveBeenCalledWith({
      where: {
        id: '99999999-9999-4999-8999-999999999999',
        orgId: membership.orgId,
        assetId,
        toTs: null,
      },
      data: { toTs: new Date(occurredAt) },
    });
    expect(tx.assetLocation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: moveId,
        orgId: membership.orgId,
        assetId,
        locationType: 'unit',
        unitId,
        propertyId: membership.propertyAssignments?.[0].propertyId,
        confirmedBy: membership.userId,
      }),
    });
    expect(tx.asset.update).toHaveBeenCalledWith({
      where: { id: assetId },
      data: expect.objectContaining({
        currentLocationType: 'unit',
        currentUnitId: unitId,
        currentStorageLocationId: null,
        currentPropertyId: membership.propertyAssignments?.[0].propertyId,
      }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'asset.moved',
        entityType: 'asset',
        entityId: assetId,
      }),
    });
    expect(result.idempotentReplay).toBe(false);
  });

  it('rejects a destination shape that does not match its location type', async () => {
    await expect(
      service.move(
        assetId,
        membership.orgId,
        {
          id: moveId,
          locationType: 'unit',
          storageLocationId: '88888888-8888-4888-8888-888888888888',
          moveReason: 'relocation',
          occurredAt,
        },
        membership,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.assetLocation.create).not.toHaveBeenCalled();
  });

  it('returns a prior move from the same caller without writing it twice', async () => {
    const priorLocation = {
      id: moveId,
      orgId: membership.orgId,
      assetId,
      createdBy: membership.userId,
    };
    tx.assetLocation.findFirst.mockReset().mockResolvedValue(priorLocation);
    tx.asset.findUniqueOrThrow.mockResolvedValue({ id: assetId, currentLocationType: 'unit' });

    const result = await service.move(
      assetId,
      membership.orgId,
      {
        id: moveId,
        locationType: 'unit',
        unitId,
        moveReason: 'relocation',
        occurredAt,
      },
      membership,
    );

    expect(result).toEqual({
      asset: { id: assetId, currentLocationType: 'unit' },
      location: priorLocation,
      idempotentReplay: true,
    });
    expect(tx.asset.findFirst).not.toHaveBeenCalled();
    expect(tx.assetLocation.create).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects a move into a property outside the membership scope', async () => {
    tx.unit.findFirst.mockResolvedValue({
      id: unitId,
      propertyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });

    await expect(
      service.move(
        assetId,
        membership.orgId,
        {
          id: moveId,
          locationType: 'unit',
          unitId,
          moveReason: 'relocation',
          occurredAt,
        },
        membership,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.assetLocation.create).not.toHaveBeenCalled();
  });
});
