import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * Mirrors POST /v1/assets — architecture.md §3.
 * "mint NPID; accepts client-generated id" — the id and npid are supplied
 * by the client (offline-generated), never server-assigned, per
 * asset-tagging-strategy.md §6.1.
 */
export class CreateAssetDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  orgId!: string;

  @IsString()
  npid!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  assetModelId?: string;

  @IsOptional()
  @IsString()
  manufacturerRaw?: string;

  @IsOptional()
  @IsString()
  modelRaw?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsIn(['scanned', 'ocr', 'typed', 'illegible', 'absent'])
  serialConfidence?: string;

  @IsOptional()
  @IsUUID()
  currentUnitId?: string;

  @IsOptional()
  @IsUUID()
  currentPropertyId?: string;

  @IsOptional()
  @IsNumber()
  purchaseCost?: number;

  @IsOptional()
  @IsBoolean()
  allowTechAssetCreate?: boolean;
}
