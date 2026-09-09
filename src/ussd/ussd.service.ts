import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../infrastructure/prisma.service';
import { RedisService } from '../infrastructure/redis.service';
import { OrdersService } from '../orders/orders.service';
import { UssdDto } from './ussd.dto';

@Injectable()
export class UssdService {
  constructor(private prisma: PrismaService, private redis: RedisService, private orders: OrdersService) {}
  async handle(dto: UssdDto): Promise<string> {
    const parts = dto.text ? dto.text.split('*') : [];
    if (!parts.length) return 'CON Karibu Mkulima Link\n1. Ingia\n2. Jiandikishe';
    if (parts[0] === '2') return this.register(dto, parts);
    if (parts[0] !== '1') return 'END Chaguo si sahihi.';
    if (parts.length === 1) return 'CON Weka PIN yako ya nambari 4:';
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phoneNumber }, include: { sellerProfile: true, wallet: true } });
    if (!user?.sellerProfile?.ussdPin || !(await compare(parts[1], user.sellerProfile.ussdPin))) return 'END PIN si sahihi.';
    if (!user.isActive) return 'END Akaunti yako imesimamishwa. Wasiliana na msaada.';
    await this.redis.setex(`ussd:${dto.sessionId}`, 120, user.id).catch(() => undefined);
    if (parts.length === 2) return `CON Habari ${user.fullName}!\n1. Tazama Bei\n2. Angalia Mahitaji\n3. Oda Zangu\n4. Pochi Yangu\n0. Toka`;
    const choice = parts[2];
    if (choice === '0') return 'END Asante kwa kutumia Mkulima Link.';
    if (choice === '1') {
      const prices = await this.prisma.cropPrice.findMany({ where: { effectiveTo: null, region: user.region }, include: { crop: true }, take: 8 });
      return `END Bei za Leo - ${user.region}:\n${prices.map(p => `${p.crop.name} - TZS ${p.pricePerUnit}/kg`).join('\n') || 'Hakuna bei kwa sasa.'}`;
    }
    if (choice === '2') {
      const demands = await this.prisma.demand.findMany({ where: { region: user.region, status: { in: ['open', 'partially_filled'] } }, include: { crop: true }, take: 5 });
      if (parts.length === 3) return `CON Mahitaji:\n${demands.map((d, i) => `${i + 1}. ${d.crop.name} ${Number(d.quantityKg) - Number(d.quantityFulfilled)}kg`).join('\n')}\n0. Rudi`;
      const demand = demands[Number(parts[3]) - 1]; if (!demand) return 'END Hitaji halipatikani.';
      if (parts.length === 4) return `CON ${demand.crop.name} @ TZS ${demand.pricePerKg}/kg\nMahali: ${demand.deliveryLocation}\nWeka kiasi (kg):`;
      const quantity = Number(parts[4]); if (!quantity || quantity <= 0) return 'END Kiasi si sahihi.';
      if (parts.length === 5) return `CON Thamani TZS ${quantity * Number(demand.pricePerKg)}\n1. Kubali\n2. Ghairi`;
      if (parts[5] !== '1') return 'END Umeghairi.';
      try { const order = await this.orders.commit({ sub: user.id, phone: user.phone, role: 'seller', isVerified: true, isDisqualified: user.isDisqualified }, { demandId: demand.id, quantityKg: quantity }); return `END Umefanikiwa! Toa ifikapo ${order.expiryAt.toLocaleString('sw-TZ')}.`; } catch (error) { return `END ${(error as Error).message}`; }
    }
    if (choice === '3') {
      const orders = await this.prisma.order.findMany({ where: { sellerId: user.id }, include: { crop: true }, orderBy: { createdAt: 'desc' }, take: 5 });
      return `END Oda Zangu:\n${orders.map(o => `${o.crop.name} ${o.quantityKg}kg - ${o.status}`).join('\n') || 'Hakuna oda.'}`;
    }
    if (choice === '4') return `END Pochi Yako:\nSalio: TZS ${user.wallet?.balance ?? 0}\nLililofungwa: TZS ${user.wallet?.lockedBalance ?? 0}`;
    return 'END Chaguo si sahihi.';
  }
  private async register(dto: UssdDto, parts: string[]): Promise<string> {
    if (parts.length === 1) return 'CON Weka jina lako kamili:';
    if (parts.length === 2) return 'CON Weka wilaya yako:';
    if (parts.length === 3) return 'CON Weka PIN mpya ya nambari 4:';
    if (!/^\d{4}$/.test(parts[3])) return 'END PIN lazima iwe nambari 4.';
    if (await this.prisma.user.findUnique({ where: { phone: dto.phoneNumber } })) return 'END Namba hii imesajiliwa tayari.';
    await this.prisma.user.create({ data: { phone: dto.phoneNumber, fullName: parts[1], role: 'seller', region: 'Dodoma', district: parts[2], isVerified: true, verificationStatus: 'approved', sellerProfile: { create: { ussdPin: await hash(parts[3], 12) } }, wallet: { create: {} } } });
    return 'END Umefanikiwa kujiandikisha. Karibu Mkulima Link!';
  }
}
