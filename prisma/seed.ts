import { AdminRole, PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const settings = [
    ['min_seller_rating', '3.0'], ['min_ratings_before_dq', '5'], ['ussd_session_ttl_sec', '120'],
    ['demand_auto_expire_days', '30'], ['default_delivery_window_hours', '48'],
    ['min_topup_amount', '10000'], ['min_withdrawal_amount', '5000'],
  ];
  for (const [key, value] of settings) await prisma.platformSetting.upsert({ where: { key }, create: { key, value }, update: {} });
  await prisma.platformWallet.upsert({ where: { id: '00000000-0000-0000-0000-000000000001' }, create: {}, update: {} });
  await prisma.commissionSetting.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: { id: '00000000-0000-0000-0000-000000000001', rate: 0.05, effectiveFrom: new Date('2026-01-01') }, update: {},
  });
  const email = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@mkulimalink.co.tz';
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  if (password) await prisma.adminUser.upsert({ where: { email }, create: { fullName: 'Mkulima Link Admin', email, passwordHash: await hash(password, 12), role: AdminRole.super_admin }, update: {} });
}

main().finally(() => prisma.$disconnect());
