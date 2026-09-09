import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RequestOtpDto {
  @ApiProperty({ example: '+255712345678' }) @Matches(/^\+255\d{9}$/) phone: string;
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
}
export class VerifyOtpDto {
  @Matches(/^\+255\d{9}$/) phone: string;
  @Matches(/^\d{6}$/) otp: string;
  @IsEnum(UserRole) role: UserRole;
}
export class RefreshDto { @IsString() refreshToken: string; }
export class LogoutDto { @IsString() refreshToken: string; }
export class ChangePinDto {
  @Matches(/^\d{6}$/) otp: string;
  @Matches(/^\d{4}$/) newPin: string;
}
export class AdminLoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @Length(8, 100) password: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\d{6}$/) totp?: string;
}
