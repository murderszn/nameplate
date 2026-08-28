import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AllocateBlockDto {
  @IsNotEmpty()
  @IsString()
  deviceId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  count?: number = 500;

  @IsOptional()
  @IsString()
  batchId?: string = 'BATCH-AUTO';
}
