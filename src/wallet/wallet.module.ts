import { Module } from '@nestjs/common';
import { WalletController, WebhooksController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [NotificationsModule], controllers: [WalletController, WebhooksController], providers: [WalletService], exports: [WalletService] })
export class WalletModule {}
