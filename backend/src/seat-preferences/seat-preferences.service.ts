import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UpsertPreferenceDto {
    preferredSide?: string;
    preferredRow?: string;
    avoidLastRow?: boolean;
}

@Injectable()
export class SeatPreferencesService {
    constructor(private prisma: PrismaService) { }

    async getPreference(userId: string) {
        let preference = await this.prisma.seatPreference.findUnique({
            where: { userId },
        });

        if (!preference) {
            // Return default preference if none exists
            return {
                userId,
                preferredSide: null,
                preferredRow: null,
                avoidLastRow: false,
            };
        }

        return preference;
    }

    async upsertPreference(userId: string, data: UpsertPreferenceDto) {
        return this.prisma.seatPreference.upsert({
            where: { userId },
            update: {
                preferredSide: data.preferredSide,
                preferredRow: data.preferredRow,
                avoidLastRow: data.avoidLastRow,
            },
            create: {
                userId,
                preferredSide: data.preferredSide,
                preferredRow: data.preferredRow,
                avoidLastRow: data.avoidLastRow || false,
            },
        });
    }
}
