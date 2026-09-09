import { NotFoundException } from '@nestjs/common';
import { DevicePlatform } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const notification = {
    id: 'notification-id',
    userId: 'user-id',
    title: 'Order update',
    body: 'Your order was confirmed',
    data: { orderId: 'order-id' },
  };

  function setup(overrides: Record<string, unknown> = {}) {
    const prisma = {
      deviceToken: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        create: jest.fn().mockResolvedValue(notification),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
      ...overrides,
    };
    const firebase = { sendEachForMulticast: jest.fn() };
    return {
      prisma,
      firebase,
      service: new NotificationsService(prisma as any, firebase as any),
    };
  }

  it('upserts a globally unique device token for the current user', async () => {
    const { prisma, service } = setup();
    prisma.deviceToken.upsert.mockResolvedValue({ token: 'fcm-token' });

    await service.registerDevice('user-id', {
      token: 'fcm-token',
      platform: DevicePlatform.android,
    });

    expect(prisma.deviceToken.upsert).toHaveBeenCalledWith({
      where: { token: 'fcm-token' },
      create: { userId: 'user-id', token: 'fcm-token', platform: DevicePlatform.android },
      update: { userId: 'user-id', platform: DevicePlatform.android, isActive: true },
    });
  });

  it('scopes notification reads to the current user', async () => {
    const { prisma, service } = setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markRead('user-id', 'other-notification')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'other-notification', userId: 'user-id' },
      data: { readAt: expect.any(Date) },
    });
  });

  it('persists notifications when Firebase delivery is unavailable', async () => {
    const { prisma, firebase, service } = setup();
    prisma.deviceToken.findMany.mockResolvedValue([{ token: 'fcm-token' }]);
    firebase.sendEachForMulticast.mockResolvedValue(null);

    await expect(
      service.notifyUser('user-id', notification.title, notification.body, notification.data),
    ).resolves.toBe(notification);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      },
    });
    expect(firebase.sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['fcm-token'],
      notification: { title: notification.title, body: notification.body },
      data: { orderId: 'order-id' },
    });
  });

  it('removes only invalid tokens returned by Firebase', async () => {
    const { prisma, firebase, service } = setup();
    prisma.deviceToken.findMany.mockResolvedValue([
      { token: 'invalid-token' },
      { token: 'temporary-error-token' },
    ]);
    firebase.sendEachForMulticast.mockResolvedValue({
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
        { success: false, error: { code: 'messaging/internal-error' } },
      ],
    });

    await service.notifyUser('user-id', notification.title, notification.body);

    expect(prisma.deviceToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', token: { in: ['invalid-token'] } },
    });
  });
});
