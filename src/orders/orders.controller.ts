import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { CommitOrderDto, DeliverOrderDto, OrderQueryDto } from './orders.dto';
import { OrdersService } from './orders.service';

@ApiBearerAuth() @ApiTags('Orders') @Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}
  @Roles('seller') @Post() commit(@CurrentUser() user: AuthUser, @Body() dto: CommitOrderDto) { return this.service.commit(user, dto); }
  @Roles('seller', 'buyer') @Get('mine') mine(@CurrentUser() user: AuthUser, @Query() query: OrderQueryDto) { return this.service.mine(user, query); }
  @Get(':id') detail(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.service.detail(id, user); }
  @Roles('seller') @Post(':id/delivered') delivered(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: DeliverOrderDto) { return this.service.delivered(id, user.sub, dto); }
  @Roles('buyer') @Post(':id/confirm') confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.service.confirm(id, user.sub); }
}
