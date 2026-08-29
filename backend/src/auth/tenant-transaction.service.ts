import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext, TenantContextValue } from './tenant-context';

/** Sets tenant/user GUCs with `is_local=true`, so they cannot leak across a pooled connection. */
@Injectable()
export class TenantTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async withTenant<T>(context: TenantContextValue, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      // Static role name: never interpolate request data into SET ROLE.
      // This drops the Supabase connection owner's RLS bypass for the scope
      // of this transaction; the migration grants this role tenant-safe DML.
      await tx.$executeRawUnsafe('SET LOCAL ROLE nameplate_app');
      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${context.orgId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${context.userId ?? ''}, true)`;
      await tx.$executeRaw`SELECT set_config('app.current_membership_id', ${context.membershipId ?? ''}, true)`;
      return TenantContext.run(context, () => work(tx));
    });
  }
}
