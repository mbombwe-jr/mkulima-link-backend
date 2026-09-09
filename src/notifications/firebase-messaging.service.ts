import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, applicationDefault, cert, getApps, initializeApp, ServiceAccount } from 'firebase-admin/app';
import { BatchResponse, getMessaging, MulticastMessage } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseMessagingService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  private app?: App;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const serviceAccountJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');

    try {
      const credential = serviceAccountJson
        ? cert(JSON.parse(serviceAccountJson) as ServiceAccount)
        : applicationDefault();
      this.app = getApps().find((app) => app.name === 'mkulima-link-notifications')
        ?? initializeApp({ credential }, 'mkulima-link-notifications');
    } catch (error) {
      this.logger.warn(`Firebase messaging is disabled: ${this.errorMessage(error)}`);
    }
  }

  async sendEachForMulticast(message: MulticastMessage): Promise<BatchResponse | null> {
    if (!this.app) return null;

    try {
      return await getMessaging(this.app).sendEachForMulticast(message);
    } catch (error) {
      this.logger.warn(`Firebase message delivery failed: ${this.errorMessage(error)}`);
      return null;
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
