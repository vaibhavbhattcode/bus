import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateAlertDto) {
    const { alertType, maxPrice, ...rest } = dto;
    return this.prisma.priceAlert.create({
      data: {
        user: { connect: { id: userId } },
        type: alertType || 'PRICE_DROP', // Default or map from DTO
        targetPrice: dto.targetPrice || maxPrice, // Map maxPrice to targetPrice if needed
        ...rest,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.priceAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, id: string) {
    const alert = await this.prisma.priceAlert.findFirst({
      where: { id, userId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return this.prisma.priceAlert.delete({
      where: { id },
    });
  }
}
