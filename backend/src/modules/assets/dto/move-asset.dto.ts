import {
  IsDateString,
  IsIn,
  Max,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * POST /v1/assets/:id/move
 *
 * The destination shape is enforced in AssetsService because it depends on
 * locationType and on tenant-owned target records. The request carries a
 * client-generated id so an offline caller can safely retain the fact's
 * identity across retries.
 */
export class MoveAssetDto {
  @IsUUID()
  id!: string;

  @IsIn(['unit', 'storage', 'vendor', 'in_transit', 'disposed', 'unknown'])
  locationType!: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  storageLocationId?: string;

  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsIn([
    'initial_install',
    'turn_replacement',
    'repair_pickup',
    'repair_return',
    'relocation',
    'storage',
    'disposal',
    'correction',
    'discovered',
    'vendor_service',
  ])
  moveReason!: string;

  @IsOptional()
  @IsIn(['recorded', 'inferred', 'discovered'])
  movementKind?: string;

  @IsOptional()
  @IsIn(['qr_scan', 'nfc_scan', 'serial_match', 'manual', 'turn_inspection', 'photo'])
  confirmationMethod?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  scanLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  scanLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scanAccuracyM?: number;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsUUID()
  serviceEventId?: string;

  @IsOptional()
  @IsUUID()
  turnId?: string;

  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsDateString()
  occurredAt!: string;
}
