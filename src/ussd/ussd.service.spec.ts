import { UssdService } from './ussd.service';

describe('UssdService', () => {
  const dto = { sessionId: 'session', phoneNumber: '+255712345678', serviceCode: '*152#', text: '' };
  it('starts with the public login and registration menu', async () => {
    const service = new UssdService({} as any, {} as any, {} as any);
    await expect(service.handle(dto)).resolves.toContain('CON Karibu Mkulima Link');
  });
  it('rejects unknown root choices', async () => {
    const service = new UssdService({} as any, {} as any, {} as any);
    await expect(service.handle({ ...dto, text: '9' })).resolves.toBe('END Chaguo si sahihi.');
  });
});
