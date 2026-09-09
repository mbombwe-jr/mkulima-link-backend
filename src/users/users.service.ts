import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { AuthUser } from '../common/auth.types';
import { PrismaService } from '../infrastructure/prisma.service';
import { ProvidersService } from '../infrastructure/providers.service';
import { BuyerRegisterDto, SellerRegisterDto, UpdateBuyerDto, UpdateSellerDto } from './users.dto';

const profileInclude = { sellerProfile: true, buyerProfile: true, wallet: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private providers: ProvidersService) {}

  async registerSeller(auth: AuthUser, dto: SellerRegisterDto) {
    this.assertRegistration(auth, dto.phone);
    if (await this.prisma.user.findUnique({ where: { phone: dto.phone } })) throw new ConflictException('Phone is already registered');
    const user = await this.prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { phone: dto.phone, fullName: dto.fullName, role: 'seller', region: dto.region, district: dto.district, ward: dto.ward, village: dto.village, isVerified: true, verificationStatus: 'approved' } });
      await tx.sellerProfile.create({ data: { userId: created.id, farmSizeAcres: dto.farmSizeAcres, cropsGrown: dto.cropsGrown, ussdPin: await hash(dto.ussdPin, 12) } });
      await tx.wallet.create({ data: { userId: created.id } });
      await tx.auditLog.create({ data: { actorId: created.id, actorType: 'seller', action: 'seller_registered', resourceType: 'user', resourceId: created.id } });
      return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: profileInclude });
    });
    await this.providers.sendSms(user.phone, `Karibu Mkulima Link, ${user.fullName}! Akaunti yako imefunguliwa.`);
    return user;
  }

  async registerBuyer(auth: AuthUser, dto: BuyerRegisterDto) {
    this.assertRegistration(auth, dto.phone);
    if (await this.prisma.user.findUnique({ where: { phone: dto.phone } })) throw new ConflictException('Phone is already registered');
    const user = await this.prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { phone: dto.phone, fullName: dto.fullName, role: 'buyer', region: dto.region, isVerified: false, verificationStatus: 'pending' } });
      await tx.buyerProfile.create({ data: { userId: created.id, businessName: dto.businessName, businessType: dto.businessType, deliveryLocation: dto.deliveryLocation } });
      await tx.auditLog.create({ data: { actorId: created.id, actorType: 'buyer', action: 'buyer_registered', resourceType: 'user', resourceId: created.id } });
      return tx.user.findUniqueOrThrow({ where: { id: created.id }, include: profileInclude });
    });
    await this.providers.sendSms(user.phone, 'Ombi lako limepokelewa. Tutakupigia simu hivi karibuni.');
    return user;
  }

  me(userId: string) { return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: profileInclude }); }
  status(userId: string) { return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { verificationStatus: true, isVerified: true, rejectionReason: true, isActive: true } }); }
  seller(id: string) { return this.prisma.user.findFirstOrThrow({ where: { id, role: 'seller' }, include: { sellerProfile: true, wallet: true, sellerRatings: true } }); }

  async updateSeller(userId: string, dto: UpdateSellerDto) {
    const { farmSizeAcres, cropsGrown, ...user } = dto;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: user }),
      this.prisma.sellerProfile.update({ where: { userId }, data: { farmSizeAcres, cropsGrown } }),
    ]);
    return this.me(userId);
  }

  async updateBuyer(userId: string, dto: UpdateBuyerDto) {
    const { businessName, businessType, deliveryLocation, ...user } = dto;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: user }),
      this.prisma.buyerProfile.update({ where: { userId }, data: { businessName, businessType, deliveryLocation } }),
    ]);
    return this.me(userId);
  }

  private assertRegistration(auth: AuthUser, phone: string): void {
    if (auth.role !== 'registration' || auth.phone !== phone) throw new ForbiddenException('A verified OTP for this phone is required');
  }
}
