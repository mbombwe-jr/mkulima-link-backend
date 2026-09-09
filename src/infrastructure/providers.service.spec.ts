import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { ProvidersService } from './providers.service';

describe('ProvidersService', () => {
  it('validates ClickPesa HMAC signatures using the raw request body', () => {
    const secret = 'webhook-secret';
    const config = { get: jest.fn((key: string) => key === 'CLICKPESA_WEBHOOK_SECRET' ? secret : undefined) } as unknown as ConfigService;
    const service = new ProvidersService({} as any, config, {} as any);
    const body = Buffer.from('{"reference":"TOPUP-1","amount":10000}');
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(service.verifyClickPesa(body, signature)).toBe(true);
    expect(service.verifyClickPesa(body, `${signature.slice(0, -1)}0`)).toBe(false);
  });
});
