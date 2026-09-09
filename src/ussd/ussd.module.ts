import { Module } from '@nestjs/common';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { OrdersModule } from '../orders/orders.module';
@Module({ imports: [OrdersModule], controllers: [UssdController], providers: [UssdService] })
export class UssdModule {}
