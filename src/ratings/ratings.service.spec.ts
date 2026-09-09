import { ConflictException } from '@nestjs/common';
import { RatingsService } from './ratings.service';

describe('RatingsService', () => {
  it('requires a confirmed or paid order', async () => {
    const tx = { order: { findFirst: jest.fn().mockResolvedValue({ id: 'order', status: 'delivered' }) } };
    const prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    const service = new RatingsService(prisma as any);
    await expect(service.create('buyer', { orderId: '779fa9f5-cc3a-424e-a455-365073548647', score: 5 })).rejects.toBeInstanceOf(ConflictException);
  });
});
