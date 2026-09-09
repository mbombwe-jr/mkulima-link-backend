import { ApiPropertyOptional } from '@nestjs/swagger';
import { DemandStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PageDto } from '../common/dto';

export class CreateDemandDto {
  @IsUUID() cropId: string;
  @Type(() => Number) @IsNumber() @Min(1) quantityKg: number;
  @IsString() deliveryLocation: string;
  @IsDateString() deliveryDeadline: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() region = 'Dodoma';
}
export class DemandQueryDto extends PageDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() cropId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional({ enum: DemandStatus }) @IsOptional() @IsEnum(DemandStatus) status?: DemandStatus;
}
