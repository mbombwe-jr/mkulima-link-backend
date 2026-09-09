import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PageDto } from '../common/dto';

export class MoneyDto {
  @Type(() => Number) @IsNumber() @Min(1) amount: number;
  @IsOptional() @IsIn(['MPESA', 'TIGO_PESA', 'AIRTEL_MONEY', 'HALOPESA']) provider?: string;
  @IsOptional() @Matches(/^\+255\d{9}$/) phone?: string;
}
export class TransactionQueryDto extends PageDto {}
export class ClickPesaWebhookDto {
  @IsString() reference: string;
  @IsIn(['SUCCESS', 'FAILED']) status: 'SUCCESS' | 'FAILED';
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
}
