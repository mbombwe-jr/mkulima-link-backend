import { AdminRole, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { PageDto } from '../common/dto';
export class ReasonDto { @IsString() @Length(3, 1000) reason: string; }
export class ApprovalDto { @IsOptional() @IsString() interviewNotes?: string; @IsOptional() @IsDateString() interviewDate?: string; }
export class CropDto { @IsString() name: string; @IsOptional() @IsString() nameSwahili?: string; @IsOptional() @IsString() category?: string; @IsOptional() @IsString() unit?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() imageUrl?: string; @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean; @IsOptional() @Type(() => Number) @IsInt() @Min(1) deliveryWindowHours?: number; }
export class PriceDto { @IsString() cropId: string; @Type(() => Number) @IsNumber() @Min(1) pricePerUnit: number; @IsOptional() @IsString() region = 'Dodoma'; @IsOptional() @IsDateString() effectiveFrom?: string; @IsOptional() @IsString() notes?: string; }
export class SettingDto { @IsString() key: string; @IsString() value: string; @IsOptional() @IsString() description?: string; }
export class CommissionDto { @Type(() => Number) @IsNumber() @Min(0) @Max(1) rate: number; @IsOptional() @IsDateString() effectiveFrom?: string; }
export class AdminQueryDto extends PageDto { @IsOptional() @IsString() status?: string; @IsOptional() @IsString() search?: string; }
export class AdminCreateDto { @IsString() fullName: string; @IsEmail() email: string; @IsEnum(AdminRole) role: AdminRole; @IsString() @Length(8, 100) password: string; }
export class AdminStatusDto { @Type(() => Boolean) @IsBoolean() isActive: boolean; }
export class OverrideDto { @IsEnum(OrderStatus) status: OrderStatus; @IsString() reason: string; }
