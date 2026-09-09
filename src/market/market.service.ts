import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DemandStatus } from '@prisma/client';
import { AuthUser } from '../common/auth.types';
import { pageArgs } from '../common/dto';
import { PrismaService } from '../infrastructure/prisma.service';
import { ProvidersService } from '../infrastructure/providers.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDemandDto, DemandQueryDto } from './market.dto';

const demandInclude = { crop: true, orders: { select: { id: true, sellerId: true, quantityKg: true, status: true, expiryAt: true } } } as const;

@Injectable()
export class MarketService {
  constructor(private prisma: PrismaService, private providers: ProvidersService, private notifications: NotificationsService) {}

  prices(cropId?: string) {
    return this.prisma.cropPrice.findMany({ where: { cropId, effectiveTo: null, crop: { isActive: true } }, include: { crop: { include: { deliveryWindow: true } } }, orderBy: { crop: { name: 'asc' } } });
  }
  async price(cropId: string) {
    const item = await this.prisma.cropPrice.findFirst({ where: { cropId, effectiveTo: null }, include: { crop: true }, orderBy: { effectiveFrom: 'desc' } });
    if (!item) throw new NotFoundException('Active crop price not found');
    return item;
  }
  history(cropId: string) { return this.prisma.cropPrice.findMany({ where: { cropId }, include: { admin: { select: { fullName: true } } }, orderBy: { effectiveFrom: 'desc' } }); }

  async createDemand(user: AuthUser, dto: CreateDemandDto) {
    const buyer = await this.prisma.user.findUnique({ where: { id: user.sub }, include: { wallet: true } });
    if (!buyer?.isVerified || buyer.verificationStatus !== 'approved') throw new ForbiddenException('Buyer is pending approval');
    const deadline = new Date(dto.deliveryDeadline);
    const minimum = new Date(); minimum.setUTCHours(0, 0, 0, 0); minimum.setUTCDate(minimum.getUTCDate() + 3);
    if (deadline < minimum) throw new UnprocessableEntityException('Delivery deadline must be at least 3 days away');
    const price = await this.prisma.cropPrice.findFirst({ where: { cropId: dto.cropId, region: dto.region, effectiveTo: null, crop: { isActive: true } }, include: { crop: true } });
    if (!price) throw new NotFoundException('No active crop price for this region');
    const demand = await this.prisma.demand.create({ data: { buyerId: user.sub, cropId: dto.cropId, region: dto.region, quantityKg: dto.quantityKg, pricePerKg: price.pricePerUnit, totalValue: dto.quantityKg * Number(price.pricePerUnit), deliveryLocation: dto.deliveryLocation, deliveryDeadline: deadline, notes: dto.notes }, include: demandInclude });
    void this.notifyMatchingSellers(demand.id, price.crop.name, dto.region, dto.quantityKg, Number(price.pricePerUnit));
    return demand;
  }

  async available(user: AuthUser, query: DemandQueryDto) {
    if (user.isDisqualified) throw new ForbiddenException('Disqualified sellers cannot browse demands');
    const seller = await this.prisma.user.findUniqueOrThrow({ where: { id: user.sub }, include: { sellerProfile: true } });
    const crops = await this.prisma.crop.findMany({ where: { name: { in: seller.sellerProfile?.cropsGrown ?? [] } }, select: { id: true } });
    const where = { status: { in: [DemandStatus.open, DemandStatus.partially_filled] }, region: query.region ?? seller.region, cropId: query.cropId ?? { in: crops.map(c => c.id) }, deliveryDeadline: { gte: new Date() }, orders: { none: { sellerId: user.sub } } } as any;
    const [data, total] = await this.prisma.$transaction([this.prisma.demand.findMany({ where, include: demandInclude, ...pageArgs(query), orderBy: { createdAt: 'desc' } }), this.prisma.demand.count({ where })]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async mine(userId: string, query: DemandQueryDto) {
    const where = { buyerId: userId, ...(query.status ? { status: query.status } : {}) };
    const [data, total] = await this.prisma.$transaction([this.prisma.demand.findMany({ where, include: demandInclude, ...pageArgs(query), orderBy: { createdAt: 'desc' } }), this.prisma.demand.count({ where })]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async detail(id: string, user: AuthUser) {
    const demand = await this.prisma.demand.findUnique({ where: { id }, include: demandInclude });
    if (!demand) throw new NotFoundException('Demand not found');
    if (user.role === 'buyer' && demand.buyerId !== user.sub) throw new ForbiddenException();
    return demand;
  }

  async cancel(id: string, buyerId: string) {
    const demand = await this.prisma.demand.findFirst({ where: { id, buyerId }, include: { orders: true } });
    if (!demand) throw new NotFoundException('Demand not found');
    if (demand.orders.some(o => ['committed', 'delivered'].includes(o.status))) throw new ForbiddenException('Demand has active orders');
    return this.prisma.demand.update({ where: { id }, data: { status: 'cancelled' } });
  }

  private async notifyMatchingSellers(demandId: string, crop: string, region: string, quantity: number, price: number): Promise<void> {
    const sellers = await this.prisma.user.findMany({ where: { role: 'seller', region, isActive: true, isVerified: true, isDisqualified: false, sellerProfile: { cropsGrown: { has: crop } } } });
    await Promise.all(sellers.map(async seller => {
      const message = `Mkulima Link: Mnunuzi anataka ${quantity}kg ya ${crop} @ TZS ${price}/kg. Angalia *152# au app.`;
      await this.prisma.sellerNotification.create({ data: { sellerId: seller.id, demandId, message } });
      await Promise.all([
        this.providers.sendSms(seller.phone, message),
        this.notifications.notifyUser(seller.id, 'Hitaji jipya la mazao', message, { type: 'new_demand', demandId }),
      ]);
    }));
  }
}
