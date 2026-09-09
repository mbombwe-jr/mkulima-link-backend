import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { AdminLoginDto, ChangePinDto, LogoutDto, RefreshDto, RequestOtpDto, VerifyOtpDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private service: AuthService) {}
  @Public() @Post('request-otp') request(@Body() dto: RequestOtpDto) { return this.service.requestOtp(dto); }
  @Public() @Post('verify-otp') verify(@Body() dto: VerifyOtpDto) { return this.service.verifyOtp(dto); }
  @Public() @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.service.refresh(dto.refreshToken); }
  @Public() @Post('logout') logout(@Body() dto: LogoutDto) { return this.service.logout(dto.refreshToken); }
  @ApiBearerAuth() @Roles('seller') @Post('change-pin') changePin(@CurrentUser() user: AuthUser, @Body() dto: ChangePinDto) { return this.service.changePin(user, dto); }
}

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private service: AuthService) {}
  @Public() @Post('login') login(@Body() dto: AdminLoginDto) { return this.service.adminLogin(dto); }
}
