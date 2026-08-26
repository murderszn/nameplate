import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';

/**
 * PATCH /v1/assets/:id — attributes only, NEVER location.
 * Per architecture.md §3: location changes must go through
 * POST /v1/assets/:id/move so every move appends to the custody ledger.
 */
export class UpdateAssetDto extends PartialType(
  OmitType(CreateAssetDto, [
    'id',
    'orgId',
    'npid',
    'currentUnitId',
    'currentPropertyId',
  ] as const),
) {}
