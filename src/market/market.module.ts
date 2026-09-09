import { Module } from '@nestjs/common';
import { DemandsController, PricesController } from './market.controller';
import { MarketService } from './market.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({ imports: [NotificationsModule], controllers: [PricesController, DemandsController], providers: [MarketService], exports: [MarketService] })
export class MarketModule {}
