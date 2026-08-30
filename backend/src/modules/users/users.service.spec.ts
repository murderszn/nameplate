import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const orgId = '11111111-1111-4111-8111-111111111111';
  const actor = { id: '22222222-2222-4222-8222-222222222222', claims: {} };
  const actorMembership = {
    id: '33333333-3333-4333-8333-333333333333',
    orgId,
    userId: actor.id,
    role: 'hq_admin',
    status: 'active',
  };
  const propertyId = '44444444-4444-4444-8444-444444444444';
  const invitedUser = {
    id: '55555555-5555-4555-8555-555555555555',
    email: 'tech@example.com',
    fullName: 'Taylor Tech',
    phone: null,
    status: 'invited',
    lastSeenAt: null,
  };

  let prisma: any;
  let tx: any;
  let service: UsersService;

  beforeEach(() => {
    tx = {
      membership: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: { count: jest.fn().mockResolvedValue(1) },
      propertyAssignment: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(invitedUser),
        upsert: jest.fn(),
      },
      membership: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const tenantTransactions = {
      withTenant: jest.fn().mockImplementation((_context, work) => work(tx)),
    };
    const config = { get: jest.fn().mockReturnValue('') };
    service = new UsersService(prisma, tenantTransactions as any, config as any);
  });

  it('lists organization memberships through the tenant transaction', async () => {
    await service.list(orgId, actor, actorMembership);

    expect(tx.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId, deletedAt: null } }),
    );
  });

  it('adds an existing Auth user to the organization with scoped maintenance access', async () => {
    tx.membership.create.mockResolvedValue({
      id: 'membership-new',
      userId: invitedUser.id,
      role: 'technician',
      employmentType: 'employee',
      hourlyLaborRate: 58,
      status: 'invited',
      createdAt: new Date('2026-08-30T01:00:00Z'),
      user: invitedUser,
      propertyAssignments: [
        { property: { id: propertyId, name: 'Sonoran Ridge', code: 'SRR' } },
      ],
    });

    const result = await service.invite(orgId, actor, actorMembership, {
      email: invitedUser.email,
      fullName: invitedUser.fullName,
      role: 'technician',
      employmentType: 'employee',
      hourlyLaborRate: 58,
      propertyIds: [propertyId],
    });

    expect(tx.property.count).toHaveBeenCalledWith({
      where: { orgId, id: { in: [propertyId] }, deletedAt: null },
    });
    expect(tx.membership.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId,
          userId: invitedUser.id,
          role: 'technician',
          invitedBy: actor.id,
        }),
      }),
    );
    expect(result.email).toBe(invitedUser.email);
    expect(result.properties).toEqual([{ id: propertyId, name: 'Sonoran Ridge', code: 'SRR' }]);
  });

  it('does not allow the maintenance-user surface to modify an owner', async () => {
    tx.membership.findFirst.mockResolvedValue({ id: 'owner-membership', role: 'owner' });

    await expect(
      service.update('owner-membership', orgId, actor, actorMembership, { status: 'revoked' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(tx.membership.update).not.toHaveBeenCalled();
  });
});
