import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { CreateRatingDto } from './ratings.dto';
import { RatingsService } from './ratings.service';

@ApiBearerAuth() @ApiTags('Ratings') @Controller('ratings')
export class RatingsController {
  constructor(private service: RatingsService) {}
  @Roles('buyer') @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateRatingDto) { return this.service.create(user.sub, dto); }
  @Roles('super_admin', 'helpdesk') @Get('seller/:id') seller(@Param('id') id: string) { return this.service.seller(id); }
}
