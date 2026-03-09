import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface SeatRecommendation {
    recommended: string[];
    reason: string;
    confidence: 'high' | 'medium' | 'low';
}

@Injectable()
export class SeatRecommendationService {
    private readonly logger = new Logger(SeatRecommendationService.name);

    constructor(
        private prisma: PrismaService,
        private redisService: RedisService,
    ) { }

    /**
     * Recommend seats for a user on a given route.
     * Algorithm:
     *  1. Fetch user's last 10 bookings to learn seat preferences
     *  2. Merge with explicit SeatPreference record (if exists)
     *  3. Filter available seats on route
     *  4. Score and rank seats, return top recommendations
     */
    async recommend(
        userId: string,
        routeId: string,
        requestedCount: number,
    ): Promise<SeatRecommendation> {
        const cacheKey = `seat:rec:${userId}:${routeId}:${requestedCount}`;
        const cached = await this.redisService.get<SeatRecommendation>(cacheKey);
        if (cached) return cached;

        const [route, pastBookings, preference] = await Promise.all([
            this.getRouteWithAvailability(routeId),
            this.getPastBookings(userId),
            this.getUserPreference(userId),
        ]);

        // Determine available seats
        const bookedSeats = new Set<string>();
        route.bookings?.forEach((b: any) =>
            b.seatNumbers?.forEach((s: string) => bookedSeats.add(s)),
        );

        const totalSeats = route.totalSeats as number;
        const seatLayout = (route.vehicle?.seatLayout as string) || '2+2';
        const allSeats = Array.from({ length: totalSeats }, (_, i) => String(i + 1));
        const available = allSeats.filter((s) => !bookedSeats.has(s));

        if (available.length < requestedCount) {
            return {
                recommended: available.slice(0, requestedCount),
                reason: 'Limited availability — showing remaining seats',
                confidence: 'low',
            };
        }

        // Learn preferences from booking history
        const learnedPrefs = this.learnFromHistory(pastBookings, seatLayout, totalSeats);

        // Merge with explicit preferences (explicit wins)
        const mergedPrefs = {
            preferWindow:
                preference?.preferredSide ? preference.preferredSide === 'window' : learnedPrefs.preferWindow,
            preferFront:
                preference?.preferredRow ? preference.preferredRow === 'front' : learnedPrefs.preferFront,
            preferBack:
                preference?.preferredRow ? preference.preferredRow === 'back' : learnedPrefs.preferBack,
            avoidLastRow:
                preference?.avoidLastRow !== undefined ? preference.avoidLastRow : learnedPrefs.avoidLastRow,
        };

        // Score all available seats
        const scored = available.map((seat) => ({
            seat,
            score: this.scoreSeat(seat, totalSeats, seatLayout, mergedPrefs),
        }));

        scored.sort((a, b) => b.score - a.score);

        // Pick consecutive seats if multiple requested (keep travel groups together)
        const recommended = pastBookings.length > 0
            ? this.pickConsecutive(scored.map((s) => s.seat), requestedCount)
            : scored.slice(0, requestedCount).map((s) => s.seat);

        const confidence =
            pastBookings.length >= 5 ? 'high' : pastBookings.length >= 2 ? 'medium' : 'low';

        const reason = this.buildReason(mergedPrefs, pastBookings.length);

        const result: SeatRecommendation = { recommended, reason, confidence };

        // Cache for 2 minutes (seat availability changes fast)
        await this.redisService.set(cacheKey, result, 120);

        return result;
    }

    /** Save or update explicit seat preference for a user */
    async savePreference(
        userId: string,
        prefs: { preferredSide?: string; preferredRow?: string; avoidLastRow?: boolean },
    ) {
        await (this.prisma as any).seatPreference.upsert({
            where: { userId },
            update: { ...prefs, updatedAt: new Date() },
            create: { userId, ...prefs },
        });
        // Bust any cached recommendations for this user
        const keys = await this.redisService.getKeys(`seat:rec:${userId}:*`);
        await Promise.all(keys.map((k) => this.redisService.del(k)));
    }

    // ─────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────

    private async getRouteWithAvailability(routeId: string) {
        return (this.prisma as any).route.findUnique({
            where: { id: routeId },
            include: {
                vehicle: { select: { seatLayout: true } },
                bookings: {
                    where: { status: { in: ['PENDING', 'CONFIRMED'] } },
                    select: { seatNumbers: true },
                },
            },
        });
    }

    private async getPastBookings(userId: string): Promise<any[]> {
        return (this.prisma as any).booking.findMany({
            where: { userId, status: { in: ['CONFIRMED', 'COMPLETED'] } },
            select: { seatNumbers: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
    }

    private async getUserPreference(userId: string): Promise<any> {
        return (this.prisma as any).seatPreference.findUnique({ where: { userId } });
    }

    private learnFromHistory(bookings: any[], layout: string, totalSeats: number) {
        if (!bookings.length) return { preferWindow: false, preferFront: false, preferBack: false, avoidLastRow: false };

        const seatsUsed: number[] = bookings.flatMap((b) =>
            (b.seatNumbers || []).map(Number),
        );

        const seatsPerRow = layout.includes('2+1') ? 3 : layout.includes('1+1') ? 2 : 4;
        const totalRows = Math.ceil(totalSeats / seatsPerRow);

        const rows = seatsUsed.map((s) => Math.ceil(s / seatsPerRow));
        const avgRow = rows.reduce((a, b) => a + b, 0) / rows.length;
        const lastRowSeats = seatsUsed.filter((s) => s > totalSeats - seatsPerRow);

        const windowSeats = seatsUsed.filter((s) => {
            const posInRow = ((s - 1) % seatsPerRow);
            return posInRow === 0 || posInRow === seatsPerRow - 1;
        });

        return {
            preferWindow: windowSeats.length / seatsUsed.length > 0.6,
            preferFront: avgRow < totalRows * 0.35,
            preferBack: avgRow > totalRows * 0.65,
            avoidLastRow: lastRowSeats.length === 0 && seatsUsed.length > 3,
        };
    }

    private scoreSeat(
        seat: string,
        totalSeats: number,
        layout: string,
        prefs: { preferWindow: boolean; preferFront: boolean; preferBack: boolean; avoidLastRow: boolean },
    ): number {
        const n = parseInt(seat);
        const seatsPerRow = layout.includes('2+1') ? 3 : layout.includes('1+1') ? 2 : 4;
        const totalRows = Math.ceil(totalSeats / seatsPerRow);
        const row = Math.ceil(n / seatsPerRow);
        const posInRow = (n - 1) % seatsPerRow;
        const isWindow = posInRow === 0 || posInRow === seatsPerRow - 1;
        const isLastRow = row === totalRows;

        let score = 50; // base

        if (prefs.preferWindow && isWindow) score += 30;
        if (!prefs.preferWindow && !isWindow) score += 10;
        if (prefs.preferFront && row <= Math.ceil(totalRows * 0.33)) score += 25;
        if (prefs.preferBack && row >= Math.ceil(totalRows * 0.67)) score += 25;
        if (prefs.avoidLastRow && isLastRow) score -= 40;
        if (!prefs.preferBack && row <= Math.ceil(totalRows * 0.5)) score += 10;

        return score;
    }

    private pickConsecutive(sorted: string[], count: number): string[] {
        if (count === 1) return [sorted[0]];

        const nums = sorted.map(Number);
        for (let i = 0; i <= nums.length - count; i++) {
            const group = nums.slice(i, i + count);
            const isConsecutive = group.every((n, j) => j === 0 || n === group[j - 1] + 1);
            if (isConsecutive) return group.map(String);
        }
        return sorted.slice(0, count);
    }

    private buildReason(
        prefs: { preferWindow: boolean; preferFront: boolean; preferBack: boolean },
        historyCount: number,
    ): string {
        const parts: string[] = [];
        if (prefs.preferWindow) parts.push('window seat');
        if (prefs.preferFront) parts.push('front rows');
        if (prefs.preferBack) parts.push('back rows');

        if (!parts.length) return 'Best available seats selected';
        const source = historyCount >= 3 ? 'your booking history' : 'your preferences';
        return `Based on ${source}: ${parts.join(', ')} preferred`;
    }
}
