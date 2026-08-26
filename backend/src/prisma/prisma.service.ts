import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient, registered as a singleton provider.
 *
 * V0 note: per architecture.md §5, production requests must set
 * `app.current_org_id` on the transaction (RLS defense-in-depth) and
 * authorization must be enforced in the application layer regardless.
 * That org-scoping interceptor is not wired up yet in this scaffold —
 * see src/common/ once guards/interceptors are added.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
