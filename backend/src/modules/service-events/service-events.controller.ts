import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ServiceEventsService } from './service-events.service';
import { CreateServiceEventDto } from './dto/create-service-event.dto';
import { UpdateServiceEventDto } from './dto/update-service-event.dto';
import { CurrentMembership, CurrentOrg } from '../../auth/current-context.decorator';
import { RequirePermissions } from '../../auth/permissions.decorator';
import type { MembershipContext } from '../../auth/auth.types';

@Controller('v1/service-events')
export class ServiceEventsController {
  constructor(private readonly serviceEventsService: ServiceEventsService) {}

  @Get()
  @RequirePermissions('service_events:read')
  findAll(
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Query('asset_id') assetId?: string,
    @Query('technician_id') technicianId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.serviceEventsService.findAll({
      orgId,
      assetId,
      technicianId,
      from,
      to,
      propertyIds: membership.propertyAssignments?.map((assignment) => assignment.propertyId),
      globalScope: ['owner', 'hq_admin', 'service_account'].includes(membership.role),
    });
  }

  @Get(':id')
  @RequirePermissions('service_events:read')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    return this.serviceEventsService.findOne(id, orgId, membership);
  }

  @Post()
  @RequirePermissions('service_events:write')
  create(@Body() dto: CreateServiceEventDto, @CurrentOrg() orgId: string, @CurrentMembership() membership: MembershipContext) {
    return this.serviceEventsService.create(dto, orgId, membership);
  }

  @Patch(':id')
  @RequirePermissions('service_events:write')
  update(
    @Param('id') id: string,
    @CurrentOrg() orgId: string,
    @CurrentMembership() membership: MembershipContext,
    @Body() dto: UpdateServiceEventDto,
  ) {
    return this.serviceEventsService.update(id, orgId, dto, membership);
  }
}
