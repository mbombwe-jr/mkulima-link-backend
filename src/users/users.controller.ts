import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { BuyerRegisterDto, SellerRegisterDto, UpdateBuyerDto, UpdateSellerDto } from './users.dto';
import { UsersService } from './users.service';

@ApiBearerAuth() @ApiTags('Sellers') @Controller('sellers')
export class SellersController {
  constructor(private service: UsersService) {}
  @Roles('registration') @Post('register') register(@CurrentUser() user: AuthUser, @Body() dto: SellerRegisterDto) { return this.service.registerSeller(user, dto); }
  @Roles('seller') @Get('me') me(@CurrentUser() user: AuthUser) { return this.service.me(user.sub); }
  @Roles('seller') @Put('me') update(@CurrentUser() user: AuthUser, @Body() dto: UpdateSellerDto) { return this.service.updateSeller(user.sub, dto); }
  @Roles('super_admin', 'helpdesk') @Get(':id') one(@Param('id') id: string) { return this.service.seller(id); }
}

@ApiBearerAuth() @ApiTags('Buyers') @Controller('buyers')
export class BuyersController {
  constructor(private service: UsersService) {}
  @Roles('registration') @Post('register') register(@CurrentUser() user: AuthUser, @Body() dto: BuyerRegisterDto) { return this.service.registerBuyer(user, dto); }
  @Roles('buyer') @Get('me') me(@CurrentUser() user: AuthUser) { return this.service.me(user.sub); }
  @Roles('buyer') @Put('me') update(@CurrentUser() user: AuthUser, @Body() dto: UpdateBuyerDto) { return this.service.updateBuyer(user.sub, dto); }
  @Roles('buyer') @Get('status') status(@CurrentUser() user: AuthUser) { return this.service.status(user.sub); }
}
