import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncEntityType, SyncOpType } from './dto/sync-push.dto';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: PrismaService;

  const mockPrismaService = {
    asset: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id || 'asset-uuid-1', ...data })),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
    },
    unit: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    serviceEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: data.id || 'se-uuid-1', ...data })),
    },
    workOrder: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('allocateBlock', () => {
    it('should pre-allocate signed Crockford-32 NPIDs for offline minting', async () => {
      const res = await service.allocateBlock({ deviceId: 'fld-dev-1', count: 10 }, 'org_test_123');
      expect(res.allocatedCount).toBe(10);
      expect(res.tags.length).toBe(10);
      expect(res.tags[0].npid).toMatch(/^NP-[0-9A-HJKMNP-TV-Z]{8}$/);
      expect(res.tags[0].signature).toBeDefined();
      expect(res.tags[0].url).toContain('https://np.app/a/NP');
      expect(res.tags[0].compactUri).toContain('np://t/NP');
    });
  });

  describe('push', () => {
    it('should apply insert-only service event mutations and handle duplicate idempotency', async () => {
      const opId = 'op-uuid-12345';
      const pushDto = {
        deviceId: 'fld-dev-1',
        operations: [
          {
            opId,
            entityType: SyncEntityType.SERVICE_EVENT,
            opType: SyncOpType.CREATE,
            occurredAt: new Date().toISOString(),
            payload: {
              assetId: 'asset-fridge',
              technicianMembershipId: 'mem-1',
              eventType: 'part_replacement',
              resolutionCode: 'part_replaced',
            },
          },
        ],
      };

      // First attempt -> applied
      const res1 = await service.push(pushDto, 'org_test_123');
      expect(res1.appliedCount).toBe(1);
      expect(res1.results[0].status).toBe('applied');

      // Replayed attempt -> duplicate
      const res2 = await service.push(pushDto, 'org_test_123');
      expect(res2.duplicateCount).toBe(1);
      expect(res2.results[0].status).toBe('duplicate');
    });
  });

  describe('pull', () => {
    it('should pull delta changes above cursor', async () => {
      mockPrismaService.asset.findMany.mockResolvedValueOnce([
        { id: 'asset-1', changeSeq: BigInt(10500), orgId: 'org_test_123' },
      ]);

      const res = await service.pull({ cursor: '10000', limit: 100 }, 'org_test_123');
      expect(res.changes.assets.length).toBe(1);
      expect(res.cursor).toBe('10500');
    });
  });
});
