import { Body, Controller, Get, Headers, Post, Query, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser, Public, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { ProvidersService } from '../infrastructure/providers.service';
import { ClickPesaWebhookDto, MoneyDto, TransactionQueryDto } from './wallet.dto';
import { WalletService } from './wallet.service';

@ApiBearerAuth() @ApiTags('Wallet') @Controller('wallet')
export class WalletController {
  constructor(private service: WalletService) {}
  @Roles('seller', 'buyer') @Get('me') me(@CurrentUser() user: AuthUser) { return this.service.me(user.sub); }
  @Roles('seller', 'buyer') @Get('transactions') transactions(@CurrentUser() user: AuthUser, @Query() query: TransactionQueryDto) { return this.service.transactions(user.sub, query); }
  @Roles('buyer') @Post('topup') topup(@CurrentUser() user: AuthUser, @Body() dto: MoneyDto) { return this.service.topup(user.sub, dto); }
  @Roles('seller') @Post('withdraw') withdraw(@CurrentUser() user: AuthUser, @Body() dto: MoneyDto) { return this.service.withdraw(user.sub, dto); }
}

@ApiTags('Webhooks') @Controller('webhooks')
export class WebhooksController {
  constructor(private service: WalletService, private providers: ProvidersService) {}
  @Public() @Post('clickpesa') clickpesa(@Req() request: RawBodyRequest<Request>, @Headers('x-clickpesa-signature') signature: string, @Body() dto: ClickPesaWebhookDto) {
    if (!request.rawBody || !this.providers.verifyClickPesa(request.rawBody, signature)) throw new UnauthorizedException('Invalid ClickPesa signature');
    return this.service.process(dto);
  }
  @Public() @Post('beem/delivery') async beemDelivery(@Body() body: Record<string, unknown>) { return { status: 'received', report: body }; }
}
