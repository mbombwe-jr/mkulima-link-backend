import { IsOptional, IsString, Matches } from 'class-validator';
export class UssdDto { @IsString() sessionId: string; @Matches(/^\+255\d{9}$/) phoneNumber: string; @IsOptional() @IsString() text = ''; @IsString() serviceCode: string; }
