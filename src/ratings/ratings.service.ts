import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma.service';
import { CreateRatingDto } from './ratings.dto';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}
  async create(buyerId: string, dto: CreateRatingDto) {
    return this.prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { id: dto.orderId, buyerId } });
      if (!order) throw new NotFoundException('Order not found');
      if (!['confirmed', 'paid'].includes(order.status)) throw new ConflictException('Order is not confirmed');
      if (await tx.rating.findUnique({ where: { orderId: dto.orderId } })) throw new ConflictException('Order is already rated');
      const seller = await tx.user.findUniqueOrThrow({ where: { id: order.sellerId } });
      const total = seller.totalRatings + 1;
      const average = (Number(seller.rating) * seller.totalRatings + dto.score) / total;
      const rating = await tx.rating.create({ data: { orderId: dto.orderId, sellerId: order.sellerId, buyerId, score: dto.score, comment: dto.comment } });
      const minRating = Number((await tx.platformSetting.findUnique({ where: { key: 'min_seller_rating' } }))?.value ?? 3);
      const minCount = Number((await tx.platformSetting.findUnique({ where: { key: 'min_ratings_before_dq' } }))?.value ?? 5);
      await tx.user.update({ where: { id: seller.id }, data: { rating: average, totalRatings: total, ...(total >= minCount && average < minRating ? { isDisqualified: true, disqualifiedAt: new Date(), disqualifiedReason: `Rating ${average.toFixed(2)} below minimum ${minRating}` } : {}) } });
      return rating;
    });
  }
  async seller(id: string) {
    const seller = await this.prisma.user.findFirst({ where: { id, role: 'seller' }, select: { id: true, fullName: true, rating: true, totalRatings: true, sellerRatings: { orderBy: { createdAt: 'desc' } } } });
    if (!seller) throw new NotFoundException('Seller not found');
    return seller;
  }
}
