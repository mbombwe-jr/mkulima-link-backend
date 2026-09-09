import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/infrastructure/prisma.service';

describe('Marketplace database workflow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let buyerToken: string;
  let sellerToken: string;
  let cropId: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'a-test-secret-that-is-at-least-32-characters';
    process.env.BEEM_API_KEY = '';
    process.env.BEEM_SECRET_KEY = '';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    const [{ database }] = await prisma.$queryRaw<Array<{ database: string }>>`SELECT current_database() AS database`;
    if (!database.toLowerCase().includes('test')) throw new Error(`Refusing to truncate non-test database: ${database}`);
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users", "crops", "commission_settings", "platform_wallet", "platform_settings" CASCADE');
    const crop = await prisma.crop.create({ data: { name: 'Mahindi', deliveryWindow: { create: { hours: 48 } }, prices: { create: { region: 'Dodoma', pricePerUnit: 100, effectiveFrom: new Date() } } } });
    cropId = crop.id;
    await prisma.commissionSetting.create({ data: { rate: 0.05, effectiveFrom: new Date() } });
    await prisma.platformWallet.create({ data: {} });
    const buyer = await prisma.user.create({ data: { phone: '+255712345678', fullName: 'Test Buyer', role: 'buyer', isVerified: true, verificationStatus: 'approved', buyerProfile: { create: { businessName: 'Buyer Ltd', businessType: 'wholesaler' } }, wallet: { create: { balance: 50000 } } } });
    const seller = await prisma.user.create({ data: { phone: '+255713345678', fullName: 'Test Seller', role: 'seller', isVerified: true, verificationStatus: 'approved', sellerProfile: { create: { cropsGrown: ['Mahindi'] } }, wallet: { create: {} } } });
    const jwt = new JwtService();
    buyerToken = jwt.sign({ sub: buyer.id, role: 'buyer', isVerified: true, isDisqualified: false }, { secret: process.env.JWT_SECRET });
    sellerToken = jwt.sign({ sub: seller.id, role: 'seller', isVerified: true, isDisqualified: false }, { secret: process.env.JWT_SECRET });
  });
  afterAll(() => app.close());

  it('settles an order through escrow and records a rating', async () => {
    const deadline = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    const demandResponse = await request(app.getHttpServer()).post('/demands').set('Authorization', `Bearer ${buyerToken}`).send({ cropId, quantityKg: 100, deliveryLocation: 'Dodoma Mjini', deliveryDeadline: deadline }).expect(201);
    const orderResponse = await request(app.getHttpServer()).post('/orders').set('Authorization', `Bearer ${sellerToken}`).send({ demandId: demandResponse.body.id, quantityKg: 100 }).expect(201);
    const orderId = orderResponse.body.id as string;
    await request(app.getHttpServer()).post(`/orders/${orderId}/delivered`).set('Authorization', `Bearer ${sellerToken}`).send({ deliveryNotes: 'Delivered in good condition' }).expect(201);
    const confirmation = await request(app.getHttpServer()).post(`/orders/${orderId}/confirm`).set('Authorization', `Bearer ${buyerToken}`).expect(201);
    expect(confirmation.body.status).toBe('paid');
    expect(Number(confirmation.body.commissionAmount)).toBe(500);
    expect(Number(confirmation.body.sellerPayout)).toBe(9500);
    await request(app.getHttpServer()).post('/ratings').set('Authorization', `Bearer ${buyerToken}`).send({ orderId, score: 5, comment: 'Reliable seller' }).expect(201);
    const [buyerWallet, sellerWallet, platformWallet] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { userId: confirmation.body.buyerId } }),
      prisma.wallet.findUniqueOrThrow({ where: { userId: confirmation.body.sellerId } }),
      prisma.platformWallet.findUniqueOrThrow({ where: { id: '00000000-0000-0000-0000-000000000001' } }),
    ]);
    expect(Number(buyerWallet.balance)).toBe(40000);
    expect(Number(buyerWallet.lockedBalance)).toBe(0);
    expect(Number(sellerWallet.balance)).toBe(9500);
    expect(Number(platformWallet.balance)).toBe(500);
  });
});
