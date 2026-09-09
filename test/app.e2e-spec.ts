import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/infrastructure/prisma.service';

describe('Application HTTP contract', () => {
  let app: INestApplication;
  beforeAll(async () => {
    process.env.JWT_SECRET = 'a-test-secret-that-is-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({ $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) })
      .compile();
    app = module.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });
  afterAll(() => app.close());

  it('reports health without authentication', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });
  it('protects marketplace endpoints', async () => {
    const response = await request(app.getHttpServer()).get('/prices').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
  it('validates public OTP input', async () => {
    await request(app.getHttpServer()).post('/auth/request-otp').send({ phone: '0712', role: 'buyer' }).expect(400);
  });
});
