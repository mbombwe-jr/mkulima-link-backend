import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { pageArgs } from '../common/dto';
import { PrismaService } from '../infrastructure/prisma.service';
import { FirebaseMessagingService } from './firebase-messaging.service';
import { NotificationQueryDto, RegisterDeviceDto } from './notifications.dto';

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseMessagingService,
  ) {}

  registerDevice(userId: string, dto: RegisterDeviceDto) {
    return this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { userId, ...dto },
      update: { userId, platform: dto.platform, isActive: true },
    });
  }

  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { userId, token } });
  }

  async list(userId: string, query: NotificationQueryDto) {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, ...pageArgs(query), orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Notification not found');
    return { success: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async notifyUser(
    userId: string,
    title: string,
    body: string,
    data: Prisma.InputJsonObject = {},
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, data },
    });
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
    });

    const fcmData = this.toFcmData(data);
    for (let offset = 0; offset < devices.length; offset += 500) {
      const tokens = devices.slice(offset, offset + 500).map(({ token }) => token);
      const response = await this.firebase.sendEachForMulticast({
        tokens,
        notification: { title, body },
        ...(Object.keys(fcmData).length > 0 ? { data: fcmData } : {}),
      });
      if (!response) continue;

      const invalidTokens = response.responses.flatMap((result, index) =>
        !result.success && result.error && INVALID_TOKEN_CODES.has(result.error.code)
          ? [tokens[index]]
          : [],
      );
      if (invalidTokens.length > 0) {
        await this.prisma.deviceToken.deleteMany({
          where: { userId, token: { in: invalidTokens } },
        });
      }
    }

    return notification;
  }

  private toFcmData(data: Prisma.InputJsonObject): Record<string, string> {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : JSON.stringify(value),
      ]),
    );
  }
}
