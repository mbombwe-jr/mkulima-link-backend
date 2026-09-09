import { Body, Controller, Header, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/auth.decorators';
import { UssdDto } from './ussd.dto';
import { UssdService } from './ussd.service';
@ApiTags('USSD') @Controller('ussd')
export class UssdController {
  constructor(private service: UssdService, private config: ConfigService) {}
  @Public() @Post('callback') @Header('Content-Type', 'text/plain; charset=utf-8') callback(@Body() dto: UssdDto, @Headers('x-beem-token') token?: string) {
    const expected = this.config.get<string>('BEEM_USSD_TOKEN'); if (expected && token !== expected) throw new UnauthorizedException('Invalid Beem token');
    return this.service.handle(dto);
  }
}
