import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import { ProvidersService } from '../infrastructure/providers.service';
import { pageArgs } from '../common/dto';
import { ClickPesaWebhookDto, MoneyDto, TransactionQueryDto } from './wallet.dto';
import { randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService, private providers: ProvidersService, private notifications: NotificationsService) {}
  me(userId: string) { return this.prisma.wallet.findUniqueOrThrow({ where: { userId } }); }
  async transactions(userId: string, query: TransactionQueryDto) {
    const [data, total] = await this.prisma.$transaction([this.prisma.walletTransaction.findMany({ where: { userId }, ...pageArgs(query), orderBy: { createdAt: 'desc' } }), this.prisma.walletTransaction.count({ where: { userId } })]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }
  async topup(userId: string, dto: MoneyDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { wallet: true } });
    if (user.role !== 'buyer' || !user.wallet) throw new ForbiddenException();
    const minimum = Number((await this.prisma.platformSetting.findUnique({ where: { key: 'min_topup_amount' } }))?.value ?? 10000);
    if (dto.amount < minimum) throw new UnprocessableEntityException(`Minimum top-up is TZS ${minimum}`);
    const reference = `TOPUP-${randomUUID()}`;
    await this.prisma.walletTransaction.create({ data: { walletId: user.wallet.id, userId, type: 'topup', amount: dto.amount, balanceBefore: user.wallet.balance, balanceAfter: user.wallet.balance, reference, status: 'pending', description: 'ClickPesa top-up' } });
    const providerResponse = await this.providers.collect({ amount: dto.amount, currency: 'TZS', phone: dto.phone ?? user.phone, reference, callback_url: `${process.env.APP_BASE_URL}/webhooks/clickpesa`, provider: dto.provider });
    return { reference, status: 'pending', providerResponse };
  }
  async withdraw(userId: string, dto: MoneyDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { wallet: true } });
    if (user.role !== 'seller' || !user.wallet) throw new ForbiddenException();
    const minimum = Number((await this.prisma.platformSetting.findUnique({ where: { key: 'min_withdrawal_amount' } }))?.value ?? 5000);
    if (dto.amount < minimum || dto.amount > Number(user.wallet.balance)) throw new UnprocessableEntityException('Invalid withdrawal amount');
    const reference = `WITHDRAW-${randomUUID()}`;
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${user.wallet!.id}::uuid FOR UPDATE`;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: user.wallet!.id } });
      if (Number(wallet.balance) < dto.amount) throw new UnprocessableEntityException('Insufficient wallet balance');
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: dto.amount } } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, userId, type: 'withdrawal', amount: dto.amount, balanceBefore: wallet.balance, balanceAfter: Number(wallet.balance) - dto.amount, reference, status: 'pending', description: 'ClickPesa withdrawal' } });
    });
    try {
      const providerResponse = await this.providers.disburse({ amount: dto.amount, currency: 'TZS', recipient_phone: dto.phone ?? user.phone, reference, callback_url: `${process.env.APP_BASE_URL}/webhooks/clickpesa`, provider: dto.provider });
      return { reference, status: 'pending', providerResponse };
    } catch (error) { await this.process({ reference, status: 'FAILED', amount: dto.amount }); throw error; }
  }
  async process(dto: ClickPesaWebhookDto): Promise<{ status: string }> {
    const changed = await this.prisma.$transaction(async tx => {
      const record = await tx.walletTransaction.findUnique({ where: { reference: dto.reference }, include: { wallet: true } });
      if (!record) throw new NotFoundException('Payment reference not found');
      if (record.status !== 'pending') return null;
      if (Number(record.amount) !== Number(dto.amount)) throw new UnprocessableEntityException('Webhook amount mismatch');
      if (dto.status === 'SUCCESS' && dto.reference.startsWith('TOPUP-')) {
        await tx.wallet.update({ where: { id: record.walletId }, data: { balance: { increment: record.amount } } });
        await tx.walletTransaction.update({ where: { id: record.id }, data: { status: 'completed', balanceAfter: Number(record.wallet.balance) + Number(record.amount) } });
      } else if (dto.status === 'SUCCESS') await tx.walletTransaction.update({ where: { id: record.id }, data: { status: 'completed' } });
      else {
        if (dto.reference.startsWith('WITHDRAW-')) await tx.wallet.update({ where: { id: record.walletId }, data: { balance: { increment: record.amount } } });
        await tx.walletTransaction.update({ where: { id: record.id }, data: { status: 'failed', balanceAfter: dto.reference.startsWith('WITHDRAW-') ? Number(record.wallet.balance) + Number(record.amount) : record.balanceAfter } });
      }
      return { userId: record.userId, topup: dto.reference.startsWith('TOPUP-'), success: dto.status === 'SUCCESS', amount: Number(record.amount) };
    });
    if (changed) {
      const title = changed.success ? (changed.topup ? 'Salio limeongezwa' : 'Fedha zimetumwa') : 'Muamala umeshindikana';
      const body = changed.success ? `Muamala wa TZS ${changed.amount} umekamilika.` : `Muamala wa TZS ${changed.amount} haukukamilika.`;
      await this.notifications.notifyUser(changed.userId, title, body, { type: changed.topup ? 'wallet_topup' : 'wallet_withdrawal', reference: dto.reference });
    }
    return { status: 'received' };
  }
}
