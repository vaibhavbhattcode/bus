import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'prisma-client-custom';

@Injectable()
export class SupportService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) { }

  async create(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        ...dto,
        user: { connect: { id: userId } },
      },
    });
  }

  async findMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        replies: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        replies: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async findAll(status?: string, page?: number, limit?: number) {
    const pageNumber = Math.max(Number(page) || 1, 1);
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * take;
    const where = status ? { status: status as any } : {};

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take) || 1;

    return {
      data: tickets,
      meta: {
        total,
        page: pageNumber,
        limit: take,
        totalPages,
      },
    };
  }

  async resolve(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'RESOLVED' as any,
        resolvedAt: new Date()
      },
    });
  }

  async getStats() {
    const [total, open, inProgress, resolved, categories] = await Promise.all([
      this.prisma.supportTicket.count(),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' as any } }),
      this.prisma.supportTicket.count({ where: { status: 'IN_PROGRESS' as any } }),
      this.prisma.supportTicket.count({ where: { status: 'RESOLVED' as any } }),
      this.prisma.supportTicket.groupBy({
        by: ['category'],
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      categories: categories.map(c => ({
        name: c.category || 'Uncategorized',
        count: c._count.id
      }))
    };
  }

  async addReply(ticketId: string, userId: string, message: string, isAdmin: boolean = false) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Update ticket status to IN_PROGRESS if admin replies
    if (isAdmin && ticket.status === 'OPEN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' as any },
      });
    }

    const reply = await this.prisma.ticketReply.create({
      data: {
        ticketId,
        userId,
        message,
        isAdmin,
      },
      include: {
        user: { select: { name: true } }
      }
    });

    if (isAdmin) {
      await this.notificationsService.create(
        ticket.userId,
        NotificationType.SYSTEM,
        'Support Ticket Update',
        `New reply on your ticket: ${ticket.subject}`,
        `/support`
      );
    }

    return reply;
  }
}
