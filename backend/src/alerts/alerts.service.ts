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

  async findFavorites(userId: string) {
    return this.prisma.favoriteRoute.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFavorite(userId: string, fromCity: string, toCity: string) {
    return this.prisma.favoriteRoute.create({
      data: {
        user: { connect: { id: userId } },
        fromCity,
        toCity,
      },
    });
  }

  async removeFavorite(userId: string, id: string) {
    const favorite = await this.prisma.favoriteRoute.findFirst({
      where: { id, userId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite route not found');
    }

    return this.prisma.favoriteRoute.delete({
      where: { id },
    });
  }
}
