import { ConfigService } from '@nestjs/config';
import { FirebaseMessagingService } from './firebase-messaging.service';

describe('FirebaseMessagingService', () => {
  it('degrades safely when service account JSON is malformed', async () => {
    const config = { get: jest.fn().mockReturnValue('{not-json') } as unknown as ConfigService;
    const service = new FirebaseMessagingService(config);

    expect(() => service.onModuleInit()).not.toThrow();
    await expect(
      service.sendEachForMulticast({ tokens: ['token'], notification: { title: 'Title' } }),
    ).resolves.toBeNull();
  });
});
