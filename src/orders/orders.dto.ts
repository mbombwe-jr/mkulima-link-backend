import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PageDto } from '../common/dto';

export class CommitOrderDto { @IsUUID() demandId: string; @Type(() => Number) @IsNumber() @Min(1) quantityKg: number; }
export class DeliverOrderDto { @IsOptional() @IsString() deliveryNotes?: string; @IsOptional() @IsString() deliveryPhotoUrl?: string; }
export class OrderQueryDto extends PageDto { @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus; }
export class OverrideOrderDto { @IsEnum(OrderStatus) status: OrderStatus; @IsString() reason: string; }
