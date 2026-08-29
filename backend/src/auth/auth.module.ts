import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from './auth.guard';
import { MembershipContextGuard } from './membership-context.guard';
import { PermissionGuard } from './permission.guard';
import { PropertyScopeGuard } from './property-scope.guard';
import { PropertyScopeService } from './property-scope.service';
import { SupabaseJwtService } from './supabase-jwt.service';
import { TenantTransactionService } from './tenant-transaction.service';
import { APP_FILTER } from '@nestjs/core';
import { ProblemDetailsFilter } from '../common/problem-details.filter';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    SupabaseJwtService,
    PropertyScopeService,
    TenantTransactionService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: MembershipContextGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_GUARD, useClass: PropertyScopeGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
  exports: [SupabaseJwtService, PropertyScopeService, TenantTransactionService],
})
export class AuthModule {}
