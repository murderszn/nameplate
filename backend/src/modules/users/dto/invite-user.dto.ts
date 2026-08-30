import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(160)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsIn(['technician', 'lead_tech', 'property_manager', 'viewer'])
  role!: string;

  @IsOptional()
  @IsIn(['employee', 'contractor', 'vendor'])
  employmentType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyLaborRate?: number;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  propertyIds!: string[];
}
