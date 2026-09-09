import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SellerRegisterDto {
  @Matches(/^\+255\d{9}$/) phone: string;
  @IsString() @Length(2, 100) fullName: string;
  @IsString() region = 'Dodoma';
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) farmSizeAcres?: number;
  @IsArray() @IsString({ each: true }) cropsGrown: string[];
  @Matches(/^\d{4}$/) ussdPin: string;
}
export class UpdateSellerDto {
  @IsOptional() @IsString() @Length(2, 100) fullName?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) farmSizeAcres?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) cropsGrown?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() profilePhoto?: string;
}
export class BuyerRegisterDto {
  @Matches(/^\+255\d{9}$/) phone: string;
  @IsString() @Length(2, 100) fullName: string;
  @IsString() @Length(2, 150) businessName: string;
  @IsIn(['wholesaler', 'retailer', 'processor', 'aggregator']) businessType: string;
  @IsString() deliveryLocation: string;
  @IsOptional() @IsString() region = 'Dodoma';
}
export class UpdateBuyerDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsIn(['wholesaler', 'retailer', 'processor', 'aggregator']) businessType?: string;
  @IsOptional() @IsString() deliveryLocation?: string;
  @IsOptional() @IsString() profilePhoto?: string;
}
