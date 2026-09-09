import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/auth.decorators';
import { PrismaService } from './infrastructure/prisma.service';
@ApiTags('System') @Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}
  @Public() @Get('health') async health() { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', timestamp: new Date().toISOString() }; }
}
