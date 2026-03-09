import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DestinationsService {
  constructor(private prisma: PrismaService) { }

  listActive() {
    return this.prisma.destinationContent.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  listAll() {
    return this.prisma.destinationContent.findMany({
      orderBy: { order: 'asc' },
    });
  }

  upsert(data: { id?: string; city: string; state: string; image: string; priceLabel?: string; order?: number; isActive?: boolean }) {
    if (data.id) {
      const { id, ...rest } = data;
      return this.prisma.destinationContent.update({ where: { id }, data: rest });
    }
    return this.prisma.destinationContent.create({ data });
  }

  delete(id: string) {
    return this.prisma.destinationContent.delete({ where: { id } });
  }
}
