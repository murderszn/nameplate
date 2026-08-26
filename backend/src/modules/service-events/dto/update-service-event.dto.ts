import { IsOptional, IsString } from 'class-validator';

/**
 * PATCH /v1/service-events/:id — "author-editable ≤24h, then admin-only"
 * per architecture.md §3 and the correction policy in data-model.md §8.
 * The 24h/author/admin enforcement belongs in the service layer (and
 * eventually a guard) once auth lands — this DTO only shapes the payload.
 */
export class UpdateServiceEventDto {
  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  resolutionCode?: string;
}
