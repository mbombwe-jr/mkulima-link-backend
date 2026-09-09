import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/auth.decorators';
import { AuthUser } from '../common/auth.types';
import { NotificationQueryDto, RegisterDeviceDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiBearerAuth()
@ApiTags('Notifications')
@Roles('buyer', 'seller')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('devices')
  registerDevice(@CurrentUser() user: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.notifications.registerDevice(user.sub, dto);
  }

  @Delete('devices/:token')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiParam({ name: 'token', description: 'Firebase Cloud Messaging registration token' })
  unregisterDevice(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.notifications.unregisterDevice(user.sub, token);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto) {
    return this.notifications.list(user.sub, query);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.sub);
  }

  @Post(':id/read')
  @ApiParam({ name: 'id', format: 'uuid' })
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}
