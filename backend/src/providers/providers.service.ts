import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
// import { ProviderStatus, VehicleType } from 'prisma-client-custom'; // Not strictly needed if not used in logic

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      include: {
        vehicles: {
          where: { deletedAt: null },
          include: {
            routes: {
              where: { deletedAt: null },
              take: 10,
              orderBy: { date: 'desc' },
            },
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async create(userId: string, dto: CreateProviderDto) {
    return this.prisma.provider.create({
      data: {
        userId,
        ...dto,
      },
    });
  }

  async update(userId: string, dto: UpdateProviderDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return this.prisma.provider.update({
      where: { userId },
      data: dto,
    });
  }

  async createVehicle(providerId: string, dto: CreateVehicleDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Check if vehicle with same registration number already exists
    const existingVehicle = await this.prisma.vehicle.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });

    if (existingVehicle) {
      if (existingVehicle.deletedAt) {
        throw new ConflictException(
          'Vehicle with this registration number already exists but is deleted. Please contact support or restore it.',
        );
      }
      throw new ConflictException('Vehicle with this registration number already exists');
    }

    return this.prisma.vehicle.create({
      data: {
        providerId,
        ...dto,
        deletedAt: null,
      },
    });
  }

  async updateVehicle(providerId: string, vehicleId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        providerId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found or not owned by provider');
    }

    if (dto.registrationNumber) {
      const existing = await this.prisma.vehicle.findUnique({
        where: { registrationNumber: dto.registrationNumber },
      });
      if (existing && existing.id !== vehicleId) {
        throw new ConflictException('Vehicle with this registration number already exists');
      }
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: dto,
    });
  }

  async deleteVehicle(providerId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        providerId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found or not owned by provider');
    }

    // Check if vehicle has routes with active bookings
    const activeRoutes = await this.prisma.route.findFirst({
      where: {
        vehicleId,
        deletedAt: null,
        bookings: {
          some: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        },
      },
    });

    if (activeRoutes) {
      throw new BadRequestException(
        'Cannot delete vehicle. It has routes with active bookings. Please cancel bookings first.',
      );
    }

    // Soft delete
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async getVehicles(providerId: string) {
    return this.prisma.vehicle.findMany({
      where: { 
        providerId,
        deletedAt: null, 
      },
      include: {
        routes: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            fromCity: true,
            toCity: true,
            date: true,
            availableSeats: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
