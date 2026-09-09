import { Module } from '@nestjs/common';
import { WalletController, WebhooksController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({ controllers: [WalletController, WebhooksController], providers: [WalletService], exports: [WalletService] })
export class WalletModule {}
