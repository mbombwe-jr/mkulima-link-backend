import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../infrastructure/prisma.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService, private orders: OrdersService) {}
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireOrders(): Promise<void> {
    const expired = await this.prisma.order.findMany({ where: { status: 'committed', expiryAt: { lte: new Date() } }, select: { id: true } });
    for (const order of expired) await this.orders.expire(order.id);
  }
  @Cron(CronExpression.EVERY_HOUR)
  async autoConfirm(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 3600000);
    const delivered = await this.prisma.order.findMany({ where: { status: 'delivered', deliveredAt: { lte: cutoff } }, select: { id: true, buyerId: true } });
    for (const order of delivered) await this.orders.confirm(order.id, order.buyerId);
  }
  @Cron('0 1 * * *')
  async expireDemands(): Promise<void> {
    const demands = await this.prisma.demand.findMany({ where: { deliveryDeadline: { lt: new Date() }, status: { in: ['open', 'partially_filled'] } }, include: { orders: { where: { status: 'committed' } } } });
    for (const demand of demands) { for (const order of demand.orders) await this.orders.expire(order.id); await this.prisma.demand.update({ where: { id: demand.id }, data: { status: 'expired' } }); }
  }
}
