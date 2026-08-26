import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ServiceEventsService } from './service-events.service';
import { CreateServiceEventDto } from './dto/create-service-event.dto';
import { UpdateServiceEventDto } from './dto/update-service-event.dto';

@Controller('v1/service-events')
export class ServiceEventsController {
  constructor(private readonly serviceEventsService: ServiceEventsService) {}

  @Get()
  findAll(
    @Query('orgId') orgId: string,
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
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('orgId') orgId: string) {
    return this.serviceEventsService.findOne(id, orgId);
  }

  @Post()
  create(@Body() dto: CreateServiceEventDto) {
    return this.serviceEventsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('orgId') orgId: string,
    @Body() dto: UpdateServiceEventDto,
  ) {
    return this.serviceEventsService.update(id, orgId, dto);
  }
}
