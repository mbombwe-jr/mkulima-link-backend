import { Module } from '@nestjs/common';
import { DemandsController, PricesController } from './market.controller';
import { MarketService } from './market.service';

@Module({ controllers: [PricesController, DemandsController], providers: [MarketService], exports: [MarketService] })
export class MarketModule {}
