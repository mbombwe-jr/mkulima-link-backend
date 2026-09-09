import { HttpService } from '@nestjs/axios';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';

@Injectable()
export class ProvidersService {
  constructor(private http: HttpService, private config: ConfigService, private prisma: PrismaService) {}

  async sendSms(phone: string, message: string): Promise<void> {
    const key = this.config.get<string>('BEEM_API_KEY');
    const secret = this.config.get<string>('BEEM_SECRET_KEY');
    if (!key || !secret) {
      await this.prisma.smsLog.create({ data: { recipient: phone, message, status: 'skipped' } });
      return;
    }
    try {
      const { data } = await firstValueFrom(this.http.post(
        this.config.get('BEEM_SMS_API_URL', 'https://apisms.beem.africa/v1/send'),
        { source_addr: this.config.get('BEEM_SENDER_ID', 'MkulimaLnk'), schedule_time: '', encoding: '0', message, recipients: [{ recipient_id: '1', dest_addr: phone }] },
        { auth: { username: key, password: secret } },
      ));
      await this.prisma.smsLog.create({ data: { recipient: phone, message, beemRequestId: data.request_id, status: 'sent' } });
    } catch {
      await this.prisma.smsLog.create({ data: { recipient: phone, message, status: 'failed' } });
    }
  }

  async collect(payload: Record<string, unknown>): Promise<unknown> { return this.clickPesa('CLICKPESA_COLLECTION_PATH', '/payments/preview-ussd-push-request', payload); }
  async disburse(payload: Record<string, unknown>): Promise<unknown> { return this.clickPesa('CLICKPESA_DISBURSEMENT_PATH', '/payouts/initiate', payload); }

  verifyClickPesa(rawBody: Buffer, signature?: string): boolean {
    const secret = this.config.get<string>('CLICKPESA_WEBHOOK_SECRET');
    if (!secret || !signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const left = Buffer.from(expected); const right = Buffer.from(signature);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private async clickPesa(pathKey: string, defaultPath: string, payload: Record<string, unknown>): Promise<unknown> {
    const apiKey = this.config.get<string>('CLICKPESA_API_KEY');
    if (!apiKey) throw new ServiceUnavailableException('ClickPesa is not configured');
    const url = `${this.config.get('CLICKPESA_API_URL', 'https://api.clickpesa.com/third-parties')}${this.config.get(pathKey, defaultPath)}`;
    try {
      const response = await firstValueFrom(this.http.post(url, payload, { headers: { Authorization: apiKey, 'Content-Type': 'application/json' } }));
      return response.data;
    } catch { throw new ServiceUnavailableException('ClickPesa request failed'); }
  }
}
