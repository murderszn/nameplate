import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateUserAccessDto {
  @IsOptional()
  @IsIn(['technician', 'lead_tech', 'property_manager', 'viewer'])
  role?: string;

  @IsOptional()
  @IsIn(['invited', 'active', 'revoked'])
  status?: string;

  @IsOptional()
  @IsIn(['employee', 'contractor', 'vendor'])
  employmentType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyLaborRate?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  propertyIds?: string[];
}
