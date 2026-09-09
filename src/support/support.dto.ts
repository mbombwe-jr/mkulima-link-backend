import { TicketPriority, TicketStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PageDto } from '../common/dto';
export class CreateTicketDto { @IsString() @Length(3, 200) subject: string; @IsString() @Length(5, 5000) description: string; @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority; }
export class UpdateTicketDto { @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus; @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority; @IsOptional() @IsUUID() assignedTo?: string; @IsOptional() @IsString() resolution?: string; }
export class TicketQueryDto extends PageDto { @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus; }
