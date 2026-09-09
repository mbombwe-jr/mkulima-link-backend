import { Injectable } from '@nestjs/common';
import { AuthUser } from '../common/auth.types';
import { pageArgs } from '../common/dto';
import { PrismaService } from '../infrastructure/prisma.service';
import { CreateTicketDto, TicketQueryDto, UpdateTicketDto } from './support.dto';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}
  create(userId: string, dto: CreateTicketDto) { return this.prisma.supportTicket.create({ data: { userId, ...dto } }); }
  mine(userId: string, query: TicketQueryDto) { return this.prisma.supportTicket.findMany({ where: { userId, status: query.status }, ...pageArgs(query), orderBy: { createdAt: 'desc' } }); }
  all(query: TicketQueryDto) { return this.prisma.supportTicket.findMany({ where: { status: query.status }, include: { user: true, admin: true }, ...pageArgs(query), orderBy: { createdAt: 'desc' } }); }
  async update(id: string, actor: AuthUser, dto: UpdateTicketDto) {
    const ticket = await this.prisma.supportTicket.update({ where: { id }, data: dto });
    await this.prisma.auditLog.create({ data: { actorId: actor.sub, actorType: 'admin', action: 'support_ticket_updated', resourceType: 'support_ticket', resourceId: id, newValue: dto as any } });
    return ticket;
  }
}
