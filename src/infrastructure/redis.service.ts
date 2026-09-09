import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;
  constructor(config: ConfigService) {
    this.client = new Redis(config.get('REDIS_URL', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.client.on('error', () => undefined);
  }
  async connect(): Promise<void> { if (this.client.status === 'wait') await this.client.connect(); }
  async get(key: string): Promise<string | null> { await this.connect(); return this.client.get(key); }
  async setex(key: string, seconds: number, value: string): Promise<void> { await this.connect(); await this.client.setex(key, seconds, value); }
  async del(key: string): Promise<void> { await this.connect(); await this.client.del(key); }
  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'wait') this.client.disconnect();
    else if (this.client.status !== 'end') await this.client.quit().catch(() => this.client.disconnect());
  }
}
