import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}

  list(segment?: string) {
    const where: any = {};
    if (segment) {
      where.OR = [{ segment }, { segment: null }];
    }
    return this.prisma.featureFlag.findMany({ where, orderBy: { key: 'asc' } });
  }

  upsert(key: string, enabled: boolean, segment?: string, description?: string) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, segment, description },
      create: { key, enabled, segment, description },
    });
  }

  toggle(id: string, enabled: boolean) {
    return this.prisma.featureFlag.update({ where: { id }, data: { enabled } });
  }

  remove(id: string) {
    return this.prisma.featureFlag.delete({ where: { id } });
  }
}
