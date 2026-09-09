import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { AuthUser } from '../common/auth.types';
import { pageArgs } from '../common/dto';
import { PrismaService } from '../infrastructure/prisma.service';
import { ProvidersService } from '../infrastructure/providers.service';
import { OrdersService } from '../orders/orders.service';
import { ApprovalDto, AdminCreateDto, AdminQueryDto, CommissionDto, CropDto, OverrideDto, PriceDto, ReasonDto, SettingDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private providers: ProvidersService, private ordersService: OrdersService) {}
  pending(query: AdminQueryDto) { return this.prisma.user.findMany({ where: { role: 'buyer', verificationStatus: 'pending' }, include: { buyerProfile: true }, ...pageArgs(query), orderBy: { createdAt: 'asc' } }); }
  users(role: 'buyer' | 'seller', query: AdminQueryDto) { return this.prisma.user.findMany({ where: { role, ...(query.status ? { verificationStatus: query.status as any } : {}), ...(query.search ? { OR: [{ fullName: { contains: query.search, mode: 'insensitive' } }, { phone: { contains: query.search } }] } : {}) }, include: { buyerProfile: true, sellerProfile: true, wallet: true }, ...pageArgs(query), orderBy: { createdAt: 'desc' } }); }
  async approve(id: string, admin: AuthUser, dto: ApprovalDto) {
    const user = await this.prisma.$transaction(async tx => {
      const buyer = await tx.user.findFirst({ where: { id, role: 'buyer' } }); if (!buyer) throw new NotFoundException('Buyer not found');
      await tx.buyerProfile.update({ where: { userId: id }, data: { interviewNotes: dto.interviewNotes, interviewDate: dto.interviewDate ? new Date(dto.interviewDate) : undefined } });
      await tx.wallet.upsert({ where: { userId: id }, create: { userId: id }, update: {} });
      const updated = await tx.user.update({ where: { id }, data: { isVerified: true, isActive: true, verificationStatus: 'approved', verifiedBy: admin.sub, verifiedAt: new Date(), rejectionReason: null } });
      await this.auditTx(tx, admin, 'buyer_approved', 'user', id, dto); return updated;
    });
    await this.providers.sendSms(user.phone, `Hongera ${user.fullName}! Akaunti yako imeidhinishwa.`); return user;
  }
  async reject(id: string, admin: AuthUser, dto: ReasonDto) { return this.changeUser(id, admin, { isVerified: false, verificationStatus: 'rejected', rejectionReason: dto.reason }, 'buyer_rejected'); }
  async suspend(id: string, admin: AuthUser, dto: ReasonDto) { return this.changeUser(id, admin, { isActive: false, verificationStatus: 'suspended', rejectionReason: dto.reason }, 'user_suspended'); }
  async reinstate(id: string, admin: AuthUser) { const user = await this.prisma.user.findUniqueOrThrow({ where: { id } }); return this.changeUser(id, admin, { isActive: true, verificationStatus: user.role === 'seller' ? 'approved' : 'approved', isVerified: true, rejectionReason: null }, 'user_reinstated'); }
  async requalify(id: string, admin: AuthUser, dto: ReasonDto) { return this.changeUser(id, admin, { isDisqualified: false, disqualifiedAt: null, disqualifiedReason: null }, 'seller_requalified', dto.reason); }
  async createCrop(admin: AuthUser, dto: CropDto) { const { deliveryWindowHours, ...data } = dto; const crop = await this.prisma.crop.create({ data: { ...data, deliveryWindow: { create: { hours: deliveryWindowHours ?? 48 } } }, include: { deliveryWindow: true } }); await this.audit(admin, 'crop_created', 'crop', crop.id, dto); return crop; }
  async updateCrop(id: string, admin: AuthUser, dto: CropDto) { const { deliveryWindowHours, ...data } = dto; const crop = await this.prisma.crop.update({ where: { id }, data: { ...data, ...(deliveryWindowHours ? { deliveryWindow: { upsert: { create: { hours: deliveryWindowHours }, update: { hours: deliveryWindowHours } } } } : {}) }, include: { deliveryWindow: true } }); await this.audit(admin, 'crop_updated', 'crop', id, dto); return crop; }
  crops() { return this.prisma.crop.findMany({ include: { deliveryWindow: true, prices: { where: { effectiveTo: null } } }, orderBy: { name: 'asc' } }); }
  async setPrice(admin: AuthUser, dto: PriceDto) {
    const date = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const price = await this.prisma.$transaction(async tx => {
      await tx.cropPrice.updateMany({ where: { cropId: dto.cropId, region: dto.region, effectiveTo: null }, data: { effectiveTo: date } });
      const created = await tx.cropPrice.create({ data: { cropId: dto.cropId, region: dto.region, pricePerUnit: dto.pricePerUnit, effectiveFrom: date, setBy: admin.sub, notes: dto.notes } });
      await this.auditTx(tx, admin, 'price_updated', 'crop', dto.cropId, dto); return created;
    });
    return price;
  }
  async setting(admin: AuthUser, dto: SettingDto) { const result = await this.prisma.platformSetting.upsert({ where: { key: dto.key }, create: { ...dto, updatedBy: admin.sub }, update: { value: dto.value, description: dto.description, updatedBy: admin.sub } }); await this.audit(admin, 'setting_updated', 'setting', undefined, dto); return result; }
  commission() { return this.prisma.commissionSetting.findFirst({ orderBy: { effectiveFrom: 'desc' } }); }
  async setCommission(admin: AuthUser, dto: CommissionDto) { const setting = await this.prisma.commissionSetting.create({ data: { rate: dto.rate, effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(), setBy: admin.sub } }); await this.audit(admin, 'commission_updated', 'commission', setting.id, dto); return setting; }
  demands(query: AdminQueryDto) { return this.prisma.demand.findMany({ where: query.status ? { status: query.status as any } : {}, include: { crop: true, buyer: true, orders: true }, ...pageArgs(query), orderBy: { createdAt: 'desc' } }); }
  orders(query: AdminQueryDto) { return this.prisma.order.findMany({ where: query.status ? { status: query.status as any } : {}, include: { crop: true, buyer: true, seller: true, demand: true }, ...pageArgs(query), orderBy: { createdAt: 'desc' } }); }
  async override(id: string, admin: AuthUser, dto: OverrideDto) {
    const current = await this.prisma.order.findUniqueOrThrow({ where: { id } });
    let order;
    if (['confirmed', 'paid'].includes(dto.status) && current.status === 'delivered') {
      order = await this.ordersService.confirm(id, current.buyerId);
    } else if (dto.status === 'cancelled' && ['committed', 'delivered'].includes(current.status)) {
      await this.ordersService.expire(id);
      order = await this.prisma.order.update({ where: { id }, data: { status: 'cancelled', cancellationReason: dto.reason } });
    } else if (dto.status === 'disputed') {
      order = await this.prisma.order.update({ where: { id }, data: { status: 'disputed', cancellationReason: dto.reason } });
    } else {
      throw new ConflictException('Unsafe or invalid order status transition');
    }
    await this.audit(admin, 'order_overridden', 'order', id, dto);
    return order;
  }
  wallet(userId: string) { return this.prisma.wallet.findUnique({ where: { userId }, include: { transactions: { orderBy: { createdAt: 'desc' } } } }); }
  async finance() { return { wallet: await this.prisma.platformWallet.findUnique({ where: { id: '00000000-0000-0000-0000-000000000001' } }), transactions: await this.prisma.platformTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }) }; }
  auditLogs(query: AdminQueryDto) { return this.prisma.auditLog.findMany({ ...pageArgs(query), orderBy: { createdAt: 'desc' } }); }
  async analytics() {
    const [sellers, buyers, pendingBuyers, openDemands, activeOrders, disqualified, platform] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: 'seller', isActive: true } }), this.prisma.user.count({ where: { role: 'buyer', isActive: true, isVerified: true } }), this.prisma.user.count({ where: { role: 'buyer', verificationStatus: 'pending' } }), this.prisma.demand.count({ where: { status: { in: ['open', 'partially_filled'] } } }), this.prisma.order.count({ where: { status: { in: ['committed', 'delivered'] } } }), this.prisma.user.count({ where: { isDisqualified: true } }), this.prisma.platformWallet.findUnique({ where: { id: '00000000-0000-0000-0000-000000000001' } }),
    ]); return { sellers, buyers, pendingBuyers, openDemands, activeOrders, disqualified, platformBalance: platform?.balance ?? 0 };
  }
  async createAdmin(dto: AdminCreateDto) { return this.prisma.adminUser.create({ data: { fullName: dto.fullName, email: dto.email.toLowerCase(), role: dto.role, passwordHash: await hash(dto.password, 12) }, select: { id: true, fullName: true, email: true, role: true, isActive: true } }); }
  admins() { return this.prisma.adminUser.findMany({ select: { id: true, fullName: true, email: true, role: true, isActive: true, lastLogin: true } }); }
  adminStatus(id: string, active: boolean) { return this.prisma.adminUser.update({ where: { id }, data: { isActive: active }, select: { id: true, isActive: true } }); }
  private async changeUser(id: string, admin: AuthUser, data: any, action: string, reason?: string) { const user = await this.prisma.user.update({ where: { id }, data }); await this.audit(admin, action, 'user', id, { ...data, reason }); return user; }
  private audit(admin: AuthUser, action: string, resourceType: string, resourceId?: string, value?: unknown) { return this.prisma.auditLog.create({ data: { actorId: admin.sub, actorType: 'admin', action, resourceType, resourceId, newValue: value as any } }); }
  private auditTx(tx: any, admin: AuthUser, action: string, resourceType: string, resourceId?: string, value?: unknown) { return tx.auditLog.create({ data: { actorId: admin.sub, actorType: 'admin', action, resourceType, resourceId, newValue: value } }); }
}
