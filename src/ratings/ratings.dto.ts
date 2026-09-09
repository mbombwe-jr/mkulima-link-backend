import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
export class CreateRatingDto { @IsUUID() orderId: string; @Type(() => Number) @IsInt() @Min(1) @Max(5) score: number; @IsOptional() @IsString() comment?: string; }
