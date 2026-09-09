import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { CreateDemandDto, DemandQueryDto } from './market.dto';
import { MarketService } from './market.service';

@ApiBearerAuth() @ApiTags('Prices') @Controller('prices')
export class PricesController {
  constructor(private service: MarketService) {}
  @Get() all() { return this.service.prices(); }
  @Get(':cropId/history') @Roles('super_admin', 'helpdesk') history(@Param('cropId') id: string) { return this.service.history(id); }
  @Get(':cropId') one(@Param('cropId') id: string) { return this.service.price(id); }
}

@ApiBearerAuth() @ApiTags('Demands') @Controller('demands')
export class DemandsController {
  constructor(private service: MarketService) {}
  @Roles('buyer') @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateDemandDto) { return this.service.createDemand(user, dto); }
  @Roles('seller') @Get() available(@CurrentUser() user: AuthUser, @Query() query: DemandQueryDto) { return this.service.available(user, query); }
  @Roles('buyer') @Get('mine') mine(@CurrentUser() user: AuthUser, @Query() query: DemandQueryDto) { return this.service.mine(user.sub, query); }
  @Get(':id') detail(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.service.detail(id, user); }
  @Roles('buyer') @Delete(':id') cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.service.cancel(id, user.sub); }
}
