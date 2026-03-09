import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly TRACKING_PREFIX = 'tracking:route:';
  private readonly TTL = 3600; // 1 hour for location data

  constructor(
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {}

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    // Verify provider owns this route/vehicle
    const route = await this.prisma.route.findUnique({
      where: { id: dto.routeId },
      include: { vehicle: true },
    });

    if (!route || route.vehicle.providerId !== userId) {
      throw new Error('Unauthorized to update tracking for this route');
    }

    const key = `${this.TRACKING_PREFIX}${dto.routeId}`;
    const data = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    await this.redisService.set(key, data, this.TTL);
    return data;
  }

  async getLocation(routeId: string) {
    const key = `${this.TRACKING_PREFIX}${routeId}`;
    return await this.redisService.get<any>(key);
  }
}
