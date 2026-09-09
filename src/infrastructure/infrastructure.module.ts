import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { ProvidersService } from './providers.service';

@Global()
@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  providers: [PrismaService, RedisService, ProvidersService],
  exports: [PrismaService, RedisService, ProvidersService],
})
export class InfrastructureModule {}
