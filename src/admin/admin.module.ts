import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
@Module({ imports: [OrdersModule, NotificationsModule], controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
