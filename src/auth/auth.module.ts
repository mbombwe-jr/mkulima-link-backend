import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, AdminAuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({ imports: [JwtModule.register({})], controllers: [AuthController, AdminAuthController], providers: [AuthService], exports: [JwtModule] })
export class AuthModule {}
