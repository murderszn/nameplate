import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum SyncEntityType {
  ASSET = 'asset',
  SERVICE_EVENT = 'service_event',
  WORK_ORDER = 'work_order',
  ASSET_LOCATION = 'asset_location',
  NPID_MINT = 'npid_mint',
}

export enum SyncOpType {
  CREATE = 'create',
  UPDATE = 'update',
  MOVE = 'move',
}

export class SyncOperationDto {
  @IsNotEmpty()
  @IsString()
  opId!: string;

  @IsNotEmpty()
  @IsEnum(SyncEntityType)
  entityType!: SyncEntityType;

  @IsNotEmpty()
  @IsEnum(SyncOpType)
  opType!: SyncOpType;

  @IsNotEmpty()
  @IsString()
  occurredAt!: string;

  @IsNotEmpty()
  @IsObject()
  payload!: Record<string, any>;
}

export class SyncPushDto {
  @IsNotEmpty()
  @IsString()
  deviceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}
