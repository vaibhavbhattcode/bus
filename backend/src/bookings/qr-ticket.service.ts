import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class QrTicketService {
    private readonly logger = new Logger(QrTicketService.name);

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private redisService: RedisService,
    ) { }

    /**
     * Generate a signed, verifiable QR ticket for a booking.
     * The QR payload is HMAC-signed to prevent forgery.
     * Returns a base64 PNG data URL ready to embed in email/app.
     */
    async generateTicket(bookingId: string, userId: string): Promise<{
        qrDataUrl: string;
        ticketData: Record<string, any>;
    }> {
        const cacheKey = `qr:ticket:${bookingId}`;
        const cached = await this.redisService.get<string>(cacheKey);
        if (cached) return JSON.parse(cached);

        const booking = await (this.prisma as any).booking.findUnique({
            where: { id: bookingId },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true } },
                route: {
                    include: {
                        vehicle: {
                            include: {
                                provider: { select: { companyName: true, contactPhone: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!booking) throw new NotFoundException('Booking not found');
        if (booking.userId !== userId) throw new NotFoundException('Booking not found');

        // Build ticket payload
        const ticketData = {
            bookingId: booking.id,
            pnr: booking.id.slice(-8).toUpperCase(), // last 8 chars as PNR
            passengerName: booking.user.name,
            phone: booking.user.phone,
            from: booking.route.fromCity,
            to: booking.route.toCity,
            date: booking.route.date,
            departureTime: booking.route.departureTime,
            arrivalTime: booking.route.arrivalTime,
            seats: booking.seatNumbers,
            totalSeats: booking.seats,
            amount: booking.totalAmount,
            status: booking.status,
            busName: booking.route.vehicle.provider.companyName,
            busNumber: booking.route.vehicle.registrationNumber,
            issuedAt: new Date().toISOString(),
        };

        // HMAC-SHA256 signature prevents QR tampering
        const secret = this.configService.get<string>('JWT_SECRET', 'busbook-secret');
        const signature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify({ bookingId, issuedAt: ticketData.issuedAt }))
            .digest('hex');

        const qrPayload = JSON.stringify({ ...ticketData, sig: signature });

        // Generate QR as PNG data URL (high error correction for scanning in sunlight)
        const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'H',
            width: 400,
            margin: 2,
            color: { dark: '#1a1a2e', light: '#ffffff' },
        });

        const result = { qrDataUrl, ticketData };

        // Cache for 1 hour
        await this.redisService.set(cacheKey, JSON.stringify(result), 3600);

        this.logger.log(`QR ticket generated for booking ${bookingId}`);
        return result;
    }

    /**
     * Verify a QR ticket scan (used by bus conductor at boarding).
     * Checks HMAC signature + booking status.
     */
    async verifyTicket(qrPayload: string): Promise<{
        valid: boolean;
        booking?: any;
        reason?: string;
    }> {
        try {
            const data = JSON.parse(qrPayload);
            const { sig, issuedAt, bookingId, ...fields } = data;

            // Re-verify HMAC signature
            const secret = this.configService.get<string>('JWT_SECRET', 'busbook-secret');
            const expectedSig = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify({ bookingId, issuedAt }))
                .digest('hex');

            if (sig !== expectedSig) {
                return { valid: false, reason: 'Invalid QR code - signature mismatch' };
            }

            // Check booking status in DB
            const booking = await (this.prisma as any).booking.findUnique({
                where: { id: bookingId },
                select: { status: true, paymentStatus: true, userId: true },
            });

            if (!booking) return { valid: false, reason: 'Booking not found' };
            if (booking.status === 'CANCELLED') return { valid: false, reason: 'Booking is cancelled' };
            if (booking.paymentStatus !== 'PAID') return { valid: false, reason: 'Payment pending' };

            return { valid: true, booking: { ...fields, status: booking.status } };
        } catch {
            return { valid: false, reason: 'Invalid QR code format' };
        }
    }
}
