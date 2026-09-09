import { Module } from '@nestjs/common';
import { BuyersController, SellersController } from './users.controller';
import { UsersService } from './users.service';

@Module({ controllers: [SellersController, BuyersController], providers: [UsersService] })
export class UsersModule {}
