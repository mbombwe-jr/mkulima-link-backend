import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { CreateTicketDto, TicketQueryDto, UpdateTicketDto } from './support.dto';
import { SupportService } from './support.service';

@ApiBearerAuth() @ApiTags('Support') @Controller('support/tickets')
export class SupportController {
  constructor(private service: SupportService) {}
  @Roles('seller', 'buyer') @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto) { return this.service.create(user.sub, dto); }
  @Roles('seller', 'buyer') @Get('mine') mine(@CurrentUser() user: AuthUser, @Query() query: TicketQueryDto) { return this.service.mine(user.sub, query); }
}

@ApiBearerAuth() @ApiTags('Admin Support') @Roles('super_admin', 'helpdesk') @Controller('admin/support/tickets')
export class AdminSupportController {
  constructor(private service: SupportService) {}
  @Get() all(@Query() query: TicketQueryDto) { return this.service.all(query); }
  @Put(':id') update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateTicketDto) { return this.service.update(id, user, dto); }
}
