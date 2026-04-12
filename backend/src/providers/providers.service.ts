import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PaginationDto, getPaginationParams, createPaginatedResponse, PaginatedResponse } from '../common/dto/pagination.dto';
import { Vehicle, Route } from 'prisma-client-custom';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find provider by user ID with paginated vehicles
   * Uses separate queries to avoid N+1 problem
   */
  async findByUser(userId: string) {
    // Get provider basic info first
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Get paginated vehicles separately with limited routes
    const vehicles = await this.prisma.vehicle.findMany({
      where: { 
        providerId: provider.id,
        deletedAt: null 
      },
      take: 10, // Limit vehicles for dashboard view
      orderBy: { createdAt: 'desc' },
      include: {
        routes: {
          where: { deletedAt: null },
          take: 5, // Limit routes per vehicle
          orderBy: { date: 'desc' },
          select: {
            id: true,
            fromCity: true,
            toCity: true,
            date: true,
            departureTime: true,
            arrivalTime: true,
            price: true,
            availableSeats: true,
            isActive: true,
          },
        },
      },
    });

    return {
      ...provider,
      vehicles,
    };
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

  /**
   * Get paginated vehicles for a provider with route counts
   */
  async getVehicles(
    providerId: string,
    pagination: PaginationDto = new PaginationDto()
  ): Promise<PaginatedResponse<Vehicle & { routes: Pick<Route, 'id' | 'fromCity' | 'toCity' | 'date' | 'availableSeats' | 'isActive'>[] }>> {
    const { skip, take } = getPaginationParams(pagination.page, pagination.limit);

    // Get total count for pagination metadata
    const total = await this.prisma.vehicle.count({
      where: {
        providerId,
        deletedAt: null,
      },
    });

    // Get paginated vehicles with selective route fields
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        providerId,
        deletedAt: null,
      },
      skip,
      take,
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
          orderBy: {
            date: 'desc',
          },
          take: 10, // Limit routes per vehicle in list view
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createPaginatedResponse(vehicles, total, pagination.page || 1, pagination.limit || 20);
  }
}
