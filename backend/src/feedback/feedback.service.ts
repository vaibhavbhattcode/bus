import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { Prisma } from 'prisma-client-custom';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const { providerId, bookingId, routeId, ...rest } = dto;
    
    const data: Prisma.FeedbackCreateInput = {
      ...rest,
      user: { connect: { id: userId } },
      provider: providerId ? { connect: { id: providerId } } : undefined,
      booking: bookingId ? { connect: { id: bookingId } } : undefined,
      route: routeId ? { connect: { id: routeId } } : undefined,
    };

    return this.prisma.feedback.create({
      data,
    });
  }

  async findAll(params: { page?: number; limit?: number } = {}) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.feedback.count(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async reply(id: string, reply: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return this.prisma.feedback.update({
      where: { id },
      data: {
        adminReply: reply,
        repliedAt: new Date(),
      },
    });
  }

  async findAllPublic() {
    return this.prisma.feedback.findMany({
      where: { isPublic: true },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProvider(providerId: string) {
    return this.prisma.feedback.findMany({
      where: { providerId, isPublic: true },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyReviews(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider profile not found');
    }

    return this.prisma.feedback.findMany({
      where: { providerId: provider.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateFeedbackDto) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { id, userId },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return this.prisma.feedback.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    const feedback = await this.prisma.feedback.findFirst({
      where: { id, userId },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return this.prisma.feedback.delete({
      where: { id },
    });
  }
}
