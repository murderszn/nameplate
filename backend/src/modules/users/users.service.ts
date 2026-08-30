import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedUser, MembershipContext } from '../../auth/auth.types';
import { TenantTransactionService } from '../../auth/tenant-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserAccessDto } from './dto/update-user-access.dto';

@Injectable()
export class UsersService {
  private readonly authAdmin?: SupabaseClient;
  private readonly inviteRedirectUrl?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantTransactions: TenantTransactionService,
    config: ConfigService,
  ) {
    const supabaseUrl = config.get<string>('supabaseUrl');
    const secretKey = config.get<string>('supabaseSecretKey');
    this.inviteRedirectUrl = config.get<string>('inviteRedirectUrl');
    if (supabaseUrl && secretKey) {
      this.authAdmin = createClient(supabaseUrl, secretKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
    }
  }

  list(orgId: string, actor: AuthenticatedUser, membership: MembershipContext) {
    return this.tenantTransactions.withTenant(
      { orgId, userId: actor.id, membershipId: membership.id },
      async (tx) => {
        const memberships = await tx.membership.findMany({
          where: { orgId, deletedAt: null },
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          include: {
            user: true,
            propertyAssignments: {
              where: { deletedAt: null },
              include: { property: true },
            },
          },
        });
        return memberships.map((row) => this.serializeMembership(row));
      },
    );
  }

  async invite(
    orgId: string,
    actor: AuthenticatedUser,
    actorMembership: MembershipContext,
    dto: InviteUserDto,
  ) {
    const email = dto.email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const existingMembership = await this.prisma.membership.findFirst({
        where: { orgId, userId: user.id, deletedAt: null },
      });
      if (existingMembership) {
        throw new ConflictException('This user already belongs to the organization');
      }
    } else {
      if (!this.authAdmin) {
        throw new ServiceUnavailableException(
          'User invitations require SUPABASE_SECRET_KEY on the API server',
        );
      }
      const { data, error } = await this.authAdmin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: dto.fullName, phone: dto.phone ?? null },
        ...(this.inviteRedirectUrl ? { redirectTo: this.inviteRedirectUrl } : {}),
      });
      if (error) throw new BadGatewayException(`Supabase invitation failed: ${error.message}`);
      if (!data.user) throw new BadGatewayException('Supabase did not return the invited user');

      // The auth.users synchronization trigger normally creates this row
      // before the Admin API returns. Upsert keeps local/test stacks robust.
      user = await this.prisma.user.upsert({
        where: { id: data.user.id },
        create: {
          id: data.user.id,
          email,
          fullName: dto.fullName,
          phone: dto.phone,
          status: 'invited',
        },
        update: {
          email,
          fullName: dto.fullName,
          phone: dto.phone,
        },
      });
    }

    return this.tenantTransactions.withTenant(
      { orgId, userId: actor.id, membershipId: actorMembership.id },
      async (tx) => {
        await this.assertProperties(tx, orgId, dto.propertyIds);
        const created = await tx.membership.create({
          data: {
            orgId,
            userId: user.id,
            role: dto.role as any,
            employmentType: dto.employmentType,
            hourlyLaborRate: dto.hourlyLaborRate,
            status: 'invited',
            invitedBy: actor.id,
            propertyAssignments: {
              create: dto.propertyIds.map((propertyId) => ({ orgId, propertyId })),
            },
          },
          include: {
            user: true,
            propertyAssignments: { include: { property: true } },
          },
        });
        return this.serializeMembership(created);
      },
    );
  }

  update(
    membershipId: string,
    orgId: string,
    actor: AuthenticatedUser,
    actorMembership: MembershipContext,
    dto: UpdateUserAccessDto,
  ) {
    return this.tenantTransactions.withTenant(
      { orgId, userId: actor.id, membershipId: actorMembership.id },
      async (tx) => {
        const current = await tx.membership.findFirst({
          where: { id: membershipId, orgId, deletedAt: null },
        });
        if (!current) throw new NotFoundException(`Membership ${membershipId} not found`);
        if (current.role === 'owner') {
          throw new ConflictException('Owner access cannot be changed from maintenance users');
        }

        if (dto.propertyIds) {
          await this.assertProperties(tx, orgId, dto.propertyIds);
          await tx.propertyAssignment.deleteMany({ where: { membershipId, orgId } });
          if (dto.propertyIds.length) {
            await tx.propertyAssignment.createMany({
              data: dto.propertyIds.map((propertyId) => ({
                orgId,
                membershipId,
                propertyId,
              })),
            });
          }
        }

        const updated = await tx.membership.update({
          where: { id: membershipId },
          data: {
            role: dto.role as any,
            status: dto.status as any,
            employmentType: dto.employmentType,
            hourlyLaborRate: dto.hourlyLaborRate,
          },
          include: {
            user: true,
            propertyAssignments: {
              where: { deletedAt: null },
              include: { property: true },
            },
          },
        });
        return this.serializeMembership(updated);
      },
    );
  }

  private async assertProperties(tx: any, orgId: string, propertyIds: string[]) {
    if (!propertyIds.length) return;
    const count = await tx.property.count({
      where: { orgId, id: { in: propertyIds }, deletedAt: null },
    });
    if (count !== propertyIds.length) {
      throw new NotFoundException('One or more assigned properties do not exist in this organization');
    }
  }

  private serializeMembership(row: any) {
    return {
      id: row.id,
      userId: row.userId,
      email: row.user.email,
      fullName: row.user.fullName,
      phone: row.user.phone,
      userStatus: row.user.status,
      role: row.role,
      employmentType: row.employmentType,
      hourlyLaborRate: row.hourlyLaborRate?.toString() ?? null,
      status: row.status,
      lastSeenAt: row.user.lastSeenAt,
      invitedAt: row.createdAt,
      properties: row.propertyAssignments.map((assignment: any) => ({
        id: assignment.property.id,
        name: assignment.property.name,
        code: assignment.property.code,
      })),
    };
  }
}
