import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

@Injectable()
export class FcmService {
    private readonly logger = new Logger(FcmService.name);
    private initialized = false;

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        this.initFirebase();
    }

    private initFirebase(): void {
        const projectId = this.configService.get<string>('FCM_PROJECT_ID');
        if (!projectId) {
            this.logger.warn('FCM_PROJECT_ID not set — push notifications disabled');
            return;
        }

        try {
            // Prefer environment-injected service account JSON
            const serviceAccountJson = this.configService.get<string>('FCM_SERVICE_ACCOUNT_JSON');
            if (serviceAccountJson) {
                const serviceAccount = JSON.parse(serviceAccountJson);
                if (!admin.apps.length) {
                    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
                }
            } else {
                // Fallback: use individual env vars
                if (!admin.apps.length) {
                    admin.initializeApp({
                        credential: admin.credential.cert({
                            projectId,
                            clientEmail: this.configService.get('FCM_CLIENT_EMAIL'),
                            privateKey: this.configService
                                .get<string>('FCM_PRIVATE_KEY', '')
                                .replace(/\\n/g, '\n'),
                        }),
                    });
                }
            }
            this.initialized = true;
            this.logger.log('Firebase Admin initialized');
        } catch (err: any) {
            this.logger.error(`Firebase init failed: ${err.message}`);
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  Token Management
    // ─────────────────────────────────────────────────────────────

    /** Register an FCM device token for a user */
    async registerToken(userId: string, token: string, device?: string): Promise<void> {
        await (this.prisma as any).fcmToken.upsert({
            where: { token },
            update: { userId, device, updatedAt: new Date() },
            create: { userId, token, device },
        });
    }

    /** Remove a device token (logout / token refresh) */
    async removeToken(token: string): Promise<void> {
        await (this.prisma as any).fcmToken.deleteMany({ where: { token } });
    }

    // ─────────────────────────────────────────────────────────────
    //  Sending Notifications
    // ─────────────────────────────────────────────────────────────

    /**
     * Send push notification to ALL devices of a user.
     * Silently removes invalid/expired tokens.
     */
    async sendToUser(userId: string, payload: PushNotificationPayload): Promise<void> {
        if (!this.initialized) return;

        const tokens = await (this.prisma as any).fcmToken.findMany({
            where: { userId },
            select: { token: true },
        });

        if (!tokens.length) return;

        const fcmTokens: string[] = tokens.map((t: any) => t.token);
        await this.sendToTokens(fcmTokens, payload);
    }

    /**
     * Broadcast to multiple users (e.g. price drop alert to all watchers).
     */
    async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
        if (!this.initialized || !userIds.length) return;

        const tokenRecords = await (this.prisma as any).fcmToken.findMany({
            where: { userId: { in: userIds } },
            select: { token: true },
        });

        const tokens = tokenRecords.map((t: any) => t.token);
        if (tokens.length) await this.sendToTokens(tokens, payload);
    }

    /**
     * Send to a specific list of FCM tokens.
     * Handles batch sending (FCM limit: 500 per request).
     */
    private async sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<void> {
        const BATCH_SIZE = 500;

        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
            const batch = tokens.slice(i, i + BATCH_SIZE);

            try {
                const response = await admin.messaging().sendEachForMulticast({
                    tokens: batch,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        imageUrl: payload.imageUrl,
                    },
                    data: payload.data || {},
                    android: {
                        notification: { sound: 'default', channelId: 'busbook_default' },
                        priority: 'high',
                    },
                    apns: {
                        payload: { aps: { sound: 'default', badge: 1 } },
                    },
                    webpush: {
                        notification: { icon: '/icons/icon-192.png', badge: '/icons/badge-72.png' },
                    },
                });

                // Cleanup invalid tokens
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errCode = resp.error?.code;
                        if (
                            errCode === 'messaging/invalid-registration-token' ||
                            errCode === 'messaging/registration-token-not-registered'
                        ) {
                            invalidTokens.push(batch[idx]);
                        }
                    }
                });

                if (invalidTokens.length) {
                    await (this.prisma as any).fcmToken.deleteMany({
                        where: { token: { in: invalidTokens } },
                    });
                    this.logger.log(`Removed ${invalidTokens.length} invalid FCM tokens`);
                }

                this.logger.log(
                    `FCM sent: ${response.successCount} success, ${response.failureCount} failures`,
                );
            } catch (err: any) {
                this.logger.error(`FCM batch send failed: ${err.message}`);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  Predefined Notification Templates
    // ─────────────────────────────────────────────────────────────

    async notifyBookingConfirmed(userId: string, from: string, to: string, bookingId: string) {
        return this.sendToUser(userId, {
            title: '🎉 Booking Confirmed!',
            body: `Your trip from ${from} to ${to} is confirmed. Have a safe journey!`,
            data: { type: 'BOOKING_CONFIRMED', bookingId },
        });
    }

    async notifyBookingCancelled(userId: string, from: string, to: string, refundAmount: number) {
        return this.sendToUser(userId, {
            title: '❌ Booking Cancelled',
            body: `Your trip ${from} → ${to} has been cancelled. Refund of ₹${refundAmount.toFixed(2)} initiated.`,
            data: { type: 'BOOKING_CANCELLED' },
        });
    }

    async notifyPriceDrop(userId: string, from: string, to: string, newPrice: number) {
        return this.sendToUser(userId, {
            title: '💰 Price Drop!',
            body: `${from} → ${to} is now just ₹${newPrice}! Book before seats fill up.`,
            data: { type: 'PRICE_DROP', fromCity: from, toCity: to },
        });
    }

    async notifyDepartureReminder(userId: string, from: string, to: string, hoursLeft: number) {
        return this.sendToUser(userId, {
            title: `🚌 Departure in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}!`,
            body: `Your bus from ${from} to ${to} departs soon. Don't miss it!`,
            data: { type: 'DEPARTURE_REMINDER' },
        });
    }

    async notifyWalletCredit(userId: string, amount: number) {
        return this.sendToUser(userId, {
            title: '💳 Wallet Credited',
            body: `₹${amount.toFixed(2)} has been added to your BusBook wallet.`,
            data: { type: 'WALLET_CREDIT' },
        });
    }
}
