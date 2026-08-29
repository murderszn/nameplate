import { Body, Controller, Post } from '@nestjs/common';
import { CurrentMembership, CurrentOrg, CurrentUser } from '../../auth/current-context.decorator';
import type { AuthenticatedUser, MembershipContext } from '../../auth/auth.types';
import { assignedPropertyIds } from '../../auth/context-access';
import { RequirePermissions } from '../../auth/permissions.decorator';
import { SyncService } from './sync.service';
import { SyncPullDto } from './dto/sync-pull.dto';
import { SyncPushDto } from './dto/sync-push.dto';
import { AllocateBlockDto } from './dto/allocate-block.dto';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * POST /v1/sync/pull
   * Returns delta changes and tombstones above the specified sequence cursor.
   */
  @Post('pull')
  @RequirePermissions('sync:read')
  async pull(
    @Body() dto: SyncPullDto,
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
  ) {
    const propertyIds = assignedPropertyIds(membership);
    const scopes = propertyIds
      ? (dto.scopes?.length ? dto.scopes.filter((scope) => propertyIds.includes(scope)) : propertyIds)
      : dto.scopes;
    return this.syncService.pull({ ...dto, scopes }, orgId, propertyIds);
  }

  /**
   * POST /v1/sync/push
   * Ingests and processes a batch of offline outbox mutations idempotently.
   */
  @Post('push')
  @RequirePermissions('sync:write')
  async push(
    @Body() dto: SyncPushDto,
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentMembership() membership: MembershipContext,
  ) {
    return this.syncService.push(
      dto,
      orgId,
      user.id,
      membership.id,
      assignedPropertyIds(membership),
    );
  }

  /**
   * POST /v1/sync/allocate-block (and POST /v1/assets/blocks/allocate alias)
   * Pre-allocates cryptographic tags for offline field minting.
   */
  @Post('allocate-block')
  @RequirePermissions('assets:write')
  async allocateBlock(
    @Body() dto: AllocateBlockDto,
    @CurrentOrg() orgId: string,
  ) {
    return this.syncService.allocateBlock(dto, orgId);
  }
}
