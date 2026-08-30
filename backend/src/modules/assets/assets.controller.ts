import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentMembership, CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions, RequirePropertyScope } from '../../auth/permissions.decorator';
import type { MembershipContext } from '../../auth/auth.types';
import { assertPropertyAccess } from '../../auth/context-access';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { MoveAssetDto } from './dto/move-asset.dto';

/**
 * Endpoint map per architecture.md §3 "Assets — the core".
 *
 * Organization and membership scope come from the authenticated request
 * context. Clients never supply tenant identity for authorization.
 */
@Controller('v1/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @RequirePermissions('assets:read')
  findAll(
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Query('property_id') propertyId?: string,
    @Query('status') status?: string,
    @Query('category') categoryId?: string,
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (propertyId) assertPropertyAccess(membership, propertyId);
    return this.assetsService.findAll({
      orgId,
      propertyId,
      status,
      categoryId,
      q,
      cursor,
      propertyIds: membership.propertyAssignments?.map((assignment) => assignment.propertyId),
      globalScope: ['owner', 'hq_admin', 'service_account'].includes(membership.role),
    });
  }

  /** GET /v1/assets/lookup?code= — the scan endpoint. Must precede :id route. */
  @Get('lookup')
  @RequirePermissions('assets:read')
  lookup(@Query('code') code: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    return this.assetsService.lookup(code, orgId, membership);
  }

  @Get(':id')
  @RequirePermissions('assets:read')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    return this.assetsService.findOne(id, orgId, membership);
  }

  @Post()
  @RequirePermissions('assets:write')
  create(@Body() dto: CreateAssetDto, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    return this.assetsService.create(dto, orgId, membership);
  }

  @Patch(':id')
  @RequirePermissions('assets:write')
  update(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, orgId, dto, membership);
  }

  @Post(':id/move')
  @RequirePermissions('assets:write')
  move(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Body() dto: MoveAssetDto,
  ) {
    return this.assetsService.move(id, orgId, dto, membership);
  }

  @Post(':id/retire')
  @RequirePermissions('assets:write')
  retire(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Body('reason') reason: string,
  ) {
    return this.assetsService.retire(id, orgId, reason, membership);
  }
}
