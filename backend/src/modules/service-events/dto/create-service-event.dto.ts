import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/** Optional part usage line, created atomically with the service event. */
export class CreatePartUsageDto {
  @IsOptional()
  @IsUUID()
  partId?: string;

  @IsOptional()
  @IsUUID()
  partCatalogId?: string;

  @IsIn(['installed', 'removed', 'swapped', 'tested', 'returned'])
  action!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitCost?: number;
}

/**
 * POST /v1/service-events — "creates event + part usages atomically"
 * per architecture.md §3. `symptomCodes` is required on repair events
 * per v0-scope.md non-negotiable #6.
 */
export class CreateServiceEventDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  orgId!: string;

  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsUUID()
  technicianId!: string;

  @IsIn([
    'inspection',
    'diagnostic',
    'repair',
    'part_replacement',
    'full_replacement',
    'installation',
    'removal',
    'cleaning',
    'preventive_maintenance',
    'warranty_service',
    'decommission',
  ])
  eventType!: string;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptomCodes?: string[];

  @IsOptional()
  @IsInt()
  laborMinutes?: number;

  @IsOptional()
  @IsNumber()
  laborRate?: number;

  @IsOptional()
  @IsArray()
  partUsages?: CreatePartUsageDto[];

  @IsDateString()
  occurredAt!: string;
}
