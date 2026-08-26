import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

/**
 * Endpoint map per architecture.md §3 "Assets — the core".
 *
 * V0 scaffold note: org scoping should come from the authenticated
 * request context (`req.orgId`), never a client-supplied header — auth
 * guards are not wired up yet in this scaffold, so `orgId` is accepted
 * as a query param for now to keep the endpoints runnable/testable.
 * Replace with `@CurrentOrg()` once the auth module lands.
 */
@Controller('v1/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  findAll(
    @Query('orgId') orgId: string,
    @Query('property_id') propertyId?: string,
    @Query('status') status?: string,
    @Query('category') categoryId?: string,
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.assetsService.findAll({
      orgId,
      propertyId,
      status,
      categoryId,
      q,
      cursor,
    });
  }

  /** GET /v1/assets/lookup?code= — the scan endpoint. Must precede :id route. */
  @Get('lookup')
  lookup(@Query('code') code: string, @Query('orgId') orgId: string) {
    return this.assetsService.lookup(code, orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('orgId') orgId: string) {
    return this.assetsService.findOne(id, orgId);
  }

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('orgId') orgId: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, orgId, dto);
  }

  @Post(':id/move')
  move() {
    return this.assetsService.move();
  }

  @Post(':id/retire')
  retire(
    @Param('id') id: string,
    @Query('orgId') orgId: string,
    @Body('reason') reason: string,
  ) {
    return this.assetsService.retire(id, orgId, reason);
  }
}
