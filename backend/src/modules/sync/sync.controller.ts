import { Body, Controller, Headers, Post, Request } from '@nestjs/common';
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
  async pull(
    @Body() dto: SyncPullDto,
    @Headers('x-org-id') headerOrgId?: string,
    @Request() req?: any,
  ) {
    const orgId = req?.user?.orgId || headerOrgId || 'org_sonoran_fund4';
    return this.syncService.pull(dto, orgId);
  }

  /**
   * POST /v1/sync/push
   * Ingests and processes a batch of offline outbox mutations idempotently.
   */
  @Post('push')
  async push(
    @Body() dto: SyncPushDto,
    @Headers('x-org-id') headerOrgId?: string,
    @Request() req?: any,
  ) {
    const orgId = req?.user?.orgId || headerOrgId || 'org_sonoran_fund4';
    const userId = req?.user?.id;
    return this.syncService.push(dto, orgId, userId);
  }

  /**
   * POST /v1/sync/allocate-block (and POST /v1/assets/blocks/allocate alias)
   * Pre-allocates cryptographic tags for offline field minting.
   */
  @Post('allocate-block')
  async allocateBlock(
    @Body() dto: AllocateBlockDto,
    @Headers('x-org-id') headerOrgId?: string,
    @Request() req?: any,
  ) {
    const orgId = req?.user?.orgId || headerOrgId || 'org_sonoran_fund4';
    return this.syncService.allocateBlock(dto, orgId);
  }
}
