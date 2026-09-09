import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { AdminCreateDto, AdminQueryDto, AdminStatusDto, ApprovalDto, CommissionDto, CropDto, OverrideDto, PriceDto, ReasonDto, SettingDto } from './admin.dto';
import { AdminService } from './admin.service';

@ApiBearerAuth() @ApiTags('Administration') @Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}
  @Roles('super_admin') @Get('buyers/pending') pending(@Query() q: AdminQueryDto) { return this.service.pending(q); }
  @Roles('super_admin', 'helpdesk') @Get('buyers') buyers(@Query() q: AdminQueryDto) { return this.service.users('buyer', q); }
  @Roles('super_admin', 'helpdesk') @Get('sellers') sellers(@Query() q: AdminQueryDto) { return this.service.users('seller', q); }
  @Roles('super_admin') @Post('buyers/:id/approve') approve(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() d: ApprovalDto) { return this.service.approve(id, u, d); }
  @Roles('super_admin') @Post('buyers/:id/reject') reject(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() d: ReasonDto) { return this.service.reject(id, u, d); }
  @Roles('super_admin') @Post('users/:id/suspend') suspend(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() d: ReasonDto) { return this.service.suspend(id, u, d); }
  @Roles('super_admin') @Post('users/:id/reinstate') reinstate(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.service.reinstate(id, u); }
  @Roles('super_admin') @Post('sellers/:id/requalify') requalify(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() d: ReasonDto) { return this.service.requalify(id, u, d); }
  @Roles('super_admin', 'helpdesk') @Get('analytics') analytics() { return this.service.analytics(); }
  @Roles('super_admin', 'helpdesk') @Get('audit') audit(@Query() q: AdminQueryDto) { return this.service.auditLogs(q); }
  @Roles('super_admin', 'helpdesk') @Get('crops') crops() { return this.service.crops(); }
  @Roles('super_admin') @Post('crops') crop(@CurrentUser() u: AuthUser, @Body() d: CropDto) { return this.service.createCrop(u, d); }
  @Roles('super_admin') @Put('crops/:id') updateCrop(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() d: CropDto) { return this.service.updateCrop(id, u, d); }
  @Roles('super_admin') @Post('prices') price(@CurrentUser() u: AuthUser, @Body() d: PriceDto) { return this.service.setPrice(u, d); }
  @Roles('super_admin') @Post('settings') setting(@CurrentUser() u: AuthUser, @Body() d: SettingDto) { return this.service.setting(u, d); }
  @Roles('super_admin', 'helpdesk') @Get('commission') commission() { return this.service.commission(); }
  @Roles('super_admin') @Post('commission') setCommission(@CurrentUser() u: AuthUser, @Body() d: CommissionDto) { return this.service.setCommission(u, d); }
  @Roles('super_admin', 'helpdesk') @Get('demands') demands(@Query() q: AdminQueryDto) { return this.service.demands(q); }
  @Roles('super_admin', 'helpdesk') @Get('orders') orders(@Query() q: AdminQueryDto) { return this.service.orders(q); }
  @Roles('super_admin') @Post('orders/:id/override') override(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() d: OverrideDto) { return this.service.override(id, u, d); }
  @Roles('super_admin', 'helpdesk') @Get('wallet/:userId') wallet(@Param('userId') id: string) { return this.service.wallet(id); }
  @Roles('super_admin') @Get('finance/platform') finance() { return this.service.finance(); }
  @Roles('super_admin') @Post('users/admin') createAdmin(@Body() d: AdminCreateDto) { return this.service.createAdmin(d); }
  @Roles('super_admin') @Get('users/admin') admins() { return this.service.admins(); }
  @Roles('super_admin') @Put('users/admin/:id') adminStatus(@Param('id') id: string, @Body() d: AdminStatusDto) { return this.service.adminStatus(id, d.isActive); }
}
