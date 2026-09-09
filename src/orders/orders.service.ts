import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { AuthUser } from '../common/auth.types';
import { pageArgs } from '../common/dto';
import { PrismaService } from '../infrastructure/prisma.service';
import { ProvidersService } from '../infrastructure/providers.service';
import { CommitOrderDto, DeliverOrderDto, OrderQueryDto } from './orders.dto';

const include = { crop: true, demand: true, seller: { select: { id: true, fullName: true, rating: true } }, buyer: { select: { id: true, fullName: true, buyerProfile: true } }, rating: true } as const;

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService, private providers: ProvidersService) {}

  async commit(user: AuthUser, dto: CommitOrderDto) {
    if (user.isDisqualified) throw new ForbiddenException('Seller is disqualified');
    try {
      const order = await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM demands WHERE id = ${dto.demandId}::uuid FOR UPDATE`;
        const demand = await tx.demand.findUnique({ where: { id: dto.demandId }, include: { crop: { include: { deliveryWindow: true } }, buyer: { include: { wallet: true } } } });
        if (!demand) throw new NotFoundException('Demand not found');
        if (!['open', 'partially_filled'].includes(demand.status)) throw new ConflictException('Demand is no longer accepting commitments');
        if (demand.deliveryDeadline < new Date()) throw new ConflictException('Demand has expired');
        const seller = await tx.user.findUnique({ where: { id: user.sub } });
        if (!seller?.isActive || !seller.isVerified || seller.isDisqualified) throw new ForbiddenException('Seller cannot commit to orders');
        if (await tx.order.findUnique({ where: { sellerId_demandId: { sellerId: user.sub, demandId: dto.demandId } } })) throw new ConflictException('Seller already committed to this demand');
        const remaining = Number(demand.quantityKg) - Number(demand.quantityFulfilled);
        if (dto.quantityKg > remaining) throw new UnprocessableEntityException(`Only ${remaining}kg remains`);
        if (!demand.buyer.wallet) throw new UnprocessableEntityException('Buyer wallet is unavailable');
        await tx.$queryRaw`SELECT id FROM wallets WHERE id = ${demand.buyer.wallet.id}::uuid FOR UPDATE`;
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { id: demand.buyer.wallet.id } });
        const total = dto.quantityKg * Number(demand.pricePerKg);
        if (Number(wallet.balance) < total) throw new UnprocessableEntityException('Buyer wallet has insufficient balance');
        const setting = await tx.commissionSetting.findFirst({ orderBy: { effectiveFrom: 'desc' } });
        const rate = Number(setting?.rate ?? 0.05);
        const expiryAt = new Date(Date.now() + (demand.crop.deliveryWindow?.hours ?? 48) * 3600000);
        const created = await tx.order.create({ data: { demandId: demand.id, sellerId: user.sub, buyerId: demand.buyerId, cropId: demand.cropId, quantityKg: dto.quantityKg, pricePerKg: demand.pricePerKg, totalAmount: total, commissionRate: rate, expiryAt } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: total }, lockedBalance: { increment: total } } });
        await tx.walletTransaction.create({ data: { walletId: wallet.id, userId: demand.buyerId, type: 'lock', amount: total, balanceBefore: wallet.balance, balanceAfter: Number(wallet.balance) - total, reference: `LOCK-${created.id}`, orderId: created.id, description: 'Order escrow lock' } });
        const fulfilled = Number(demand.quantityFulfilled) + dto.quantityKg;
        await tx.demand.update({ where: { id: demand.id }, data: { quantityFulfilled: fulfilled, status: fulfilled >= Number(demand.quantityKg) ? 'fulfilled' : 'partially_filled' } });
        return tx.order.findUniqueOrThrow({ where: { id: created.id }, include });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      await Promise.all([
        this.providers.sendSms((await this.prisma.user.findUniqueOrThrow({ where: { id: order.sellerId } })).phone, `Umefanikiwa kukubali oda ya ${order.quantityKg}kg ya ${order.crop.name}. Toa ifikapo ${order.expiryAt.toISOString()}.`),
        this.providers.sendSms((await this.prisma.user.findUniqueOrThrow({ where: { id: order.buyerId } })).phone, `Muuzaji amekubali kutoa ${order.quantityKg}kg ya ${order.crop.name}.`),
      ]);
      return order;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Seller already committed to this demand');
      throw error;
    }
  }

  async mine(user: AuthUser, query: OrderQueryDto) {
    const where = { ...(user.role === 'seller' ? { sellerId: user.sub } : { buyerId: user.sub }), ...(query.status ? { status: query.status } : {}) };
    const [data, total] = await this.prisma.$transaction([this.prisma.order.findMany({ where, include, ...pageArgs(query), orderBy: { createdAt: 'desc' } }), this.prisma.order.count({ where })]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async detail(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, include });
    if (!order) throw new NotFoundException('Order not found');
    if (!user.admin && ![order.sellerId, order.buyerId].includes(user.sub)) throw new ForbiddenException();
    return order;
  }

  async delivered(id: string, sellerId: string, dto: DeliverOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id, sellerId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'committed' || order.expiryAt <= new Date()) throw new ConflictException('Order cannot be marked delivered');
    const updated = await this.prisma.order.update({ where: { id }, data: { status: 'delivered', deliveredAt: new Date(), ...dto }, include });
    const buyer = await this.prisma.user.findUniqueOrThrow({ where: { id: order.buyerId } });
    await this.providers.sendSms(buyer.phone, 'Muuzaji anasema ametoa. Thibisha mapokezi kwenye app.');
    return updated;
  }

  async confirm(id: string, buyerId: string) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id, buyerId }, include: { buyer: { include: { wallet: true } }, seller: { include: { wallet: true } } } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'paid') return order;
      if (order.status !== 'delivered') throw new ConflictException('Only delivered orders can be confirmed');
      const buyerWallet = order.buyer.wallet; const sellerWallet = order.seller.wallet;
      if (!buyerWallet || !sellerWallet) throw new UnprocessableEntityException('Wallet is unavailable');
      await tx.$queryRaw`SELECT id FROM wallets WHERE id IN (${buyerWallet.id}::uuid, ${sellerWallet.id}::uuid) FOR UPDATE`;
      const total = Number(order.totalAmount); const commission = total * Number(order.commissionRate); const payout = total - commission;
      await tx.wallet.update({ where: { id: buyerWallet.id }, data: { lockedBalance: { decrement: total } } });
      await tx.wallet.update({ where: { id: sellerWallet.id }, data: { balance: { increment: payout } } });
      await tx.walletTransaction.createMany({ data: [
        { walletId: buyerWallet.id, userId: buyerId, type: TransactionType.debit, amount: total, balanceBefore: buyerWallet.balance, balanceAfter: buyerWallet.balance, reference: `DEBIT-${id}`, orderId: id, description: 'Escrow settled' },
        { walletId: sellerWallet.id, userId: order.sellerId, type: TransactionType.credit, amount: payout, balanceBefore: sellerWallet.balance, balanceAfter: Number(sellerWallet.balance) + payout, reference: `PAYOUT-${id}`, orderId: id, description: 'Order payout' },
      ] });
      await tx.platformWallet.upsert({ where: { id: '00000000-0000-0000-0000-000000000001' }, create: { balance: commission }, update: { balance: { increment: commission } } });
      await tx.platformTransaction.create({ data: { orderId: id, amount: commission } });
      return tx.order.update({ where: { id }, data: { status: 'paid', confirmedAt: new Date(), paidAt: new Date(), commissionAmount: commission, sellerPayout: payout }, include });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async expire(id: string): Promise<void> {
    await this.prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id }, include: { buyer: { include: { wallet: true } }, demand: true } });
      if (!order || !['committed', 'delivered'].includes(order.status)) return;
      const wallet = order.buyer.wallet!; const amount = Number(order.totalAmount);
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount }, lockedBalance: { decrement: amount } } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, userId: order.buyerId, type: 'unlock', amount, balanceBefore: wallet.balance, balanceAfter: Number(wallet.balance) + amount, reference: `UNLOCK-${id}`, orderId: id } });
      await tx.order.update({ where: { id }, data: { status: 'expired' } });
      const fulfilled = Math.max(0, Number(order.demand.quantityFulfilled) - Number(order.quantityKg));
      await tx.demand.update({ where: { id: order.demandId }, data: { quantityFulfilled: fulfilled, status: fulfilled > 0 ? 'partially_filled' : 'open' } });
    });
  }
}
