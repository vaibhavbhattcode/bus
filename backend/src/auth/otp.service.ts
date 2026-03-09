import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SystemSettingsService } from '../common/services/system-settings.service';

/** OTP is valid for 5 minutes */
const OTP_TTL_MINUTES = 5;
const OTP_RATE_LIMIT_TTL = 60; // 1 request per minute per phone

@Injectable()
export class OtpService {
    private readonly logger = new Logger(OtpService.name);

    constructor(
        private prisma: PrismaService,
        private redisService: RedisService,
        private configService: ConfigService,
        private jwtService: JwtService,
        private systemSettings: SystemSettingsService,
    ) { }

    // ─────────────────────────────────────────────────────────────
    //  Send OTP
    // ─────────────────────────────────────────────────────────────

    async sendOtp(phone: string): Promise<{ message: string }> {
        const isEnabled = await this.systemSettings.isOtpLoginEnabled();
        if (!isEnabled) {
            throw new BadRequestException('OTP login is currently disabled.');
        }

        // Rate-limit: 1 OTP per minute per phone
        const rateLimitKey = `otp:ratelimit:${phone}`;
        const isRateLimited = await this.redisService.get(rateLimitKey);
        if (isRateLimited) {
            throw new BadRequestException('Please wait 60 seconds before requesting another OTP');
        }

        // Generate 6-digit OTP
        const otp = this.generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

        // Invalidate any previous OTPs for this phone
        await (this.prisma as any).otpRequest.updateMany({
            where: { phone, verified: false },
            data: { verified: true }, // mark old ones as used
        });

        // Store new OTP request
        await (this.prisma as any).otpRequest.create({
            data: { phone, otpHash, expiresAt, attempts: 0 },
        });

        // Set rate limit
        await this.redisService.set(rateLimitKey, '1', OTP_RATE_LIMIT_TTL);

        // Send SMS
        await this.sendSms(phone, otp);

        this.logger.log(`OTP sent to ${phone}`);

        // In dev/test: log OTP (never do this in production!)
        if (this.configService.get('NODE_ENV') !== 'production') {
            this.logger.warn(`[DEV ONLY] OTP for ${phone}: ${otp}`);
        }

        return { message: 'OTP sent successfully' };
    }

    // ─────────────────────────────────────────────────────────────
    //  Verify OTP + issue JWT
    // ─────────────────────────────────────────────────────────────

    async verifyOtp(phone: string, otp: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
        isNewUser: boolean;
    }> {
        const isEnabled = await this.systemSettings.isOtpLoginEnabled();
        if (!isEnabled) {
            throw new BadRequestException('OTP login is currently disabled.');
        }

        const maxAttempts = await this.systemSettings.getMaxOtpAttempts();

        // Find latest unverified OTP
        const otpRequest = await (this.prisma as any).otpRequest.findFirst({
            where: { phone, verified: false, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRequest) {
            throw new BadRequestException('OTP has expired or not found. Please request a new OTP.');
        }

        if (otpRequest.attempts >= maxAttempts) {
            // Invalidate this OTP
            await (this.prisma as any).otpRequest.update({
                where: { id: otpRequest.id },
                data: { verified: true },
            });
            throw new BadRequestException('Too many wrong attempts. Please request a new OTP.');
        }

        const isValid = await bcrypt.compare(otp, otpRequest.otpHash);

        if (!isValid) {
            await (this.prisma as any).otpRequest.update({
                where: { id: otpRequest.id },
                data: { attempts: { increment: 1 } },
            });
            const remaining = maxAttempts - otpRequest.attempts - 1;
            throw new BadRequestException(
                `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
            );
        }

        // Mark OTP as verified
        await (this.prisma as any).otpRequest.update({
            where: { id: otpRequest.id },
            data: { verified: true },
        });

        // Find or create user by phone
        let user = await (this.prisma as any).user.findFirst({ where: { phone } });
        const isNewUser = !user;

        if (!user) {
            user = await (this.prisma as any).user.create({
                data: {
                    phone,
                    name: `User_${phone.slice(-4)}`,
                    email: `${phone}@phone.busbook.in`,
                    password: '',       // no password for phone users
                    role: 'PASSENGER',
                    isPhoneVerified: true,
                },
            });
            this.logger.log(`New user created via OTP: ${phone}`);
        } else if (!user.isPhoneVerified) {
            await (this.prisma as any).user.update({
                where: { id: user.id },
                data: { isPhoneVerified: true },
            });
        }

        // Issue JWT tokens
        const payload = { sub: user.id, email: user.email, role: user.role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET'),
                expiresIn: '7d',
            }),
        ]);

        const { password: _, ...safeUser } = user;

        return { accessToken, refreshToken, user: safeUser, isNewUser };
    }

    // ─────────────────────────────────────────────────────────────
    //  Private helpers
    // ─────────────────────────────────────────────────────────────

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * SMS dispatch - uses Fast2SMS (Indian market) or any SMS provider.
     * Falls back to console log in development.
     * Configure via env: SMS_API_KEY, SMS_PROVIDER ('fast2sms' | 'msg91' | 'twilio')
     */
    private async sendSms(phone: string, otp: string): Promise<void> {
        const provider = this.configService.get<string>('SMS_PROVIDER', 'console');
        const message = `Your BusBook OTP is ${otp}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share with anyone.`;

        if (provider === 'fast2sms') {
            await this.sendFast2Sms(phone, otp);
        } else if (provider === 'msg91') {
            await this.sendMsg91(phone, otp);
        } else if (provider === 'twilio') {
            await this.sendTwilio(phone, message);
        } else {
            // Console fallback (dev mode)
            this.logger.log(`[SMS CONSOLE] To: ${phone} | Message: ${message}`);
        }
    }

    private async sendFast2Sms(phone: string, otp: string): Promise<void> {
        const apiKey = this.configService.get<string>('SMS_API_KEY');
        if (!apiKey) return;

        const { default: axios } = await import('axios');
        await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            params: {
                authorization: apiKey,
                variables_values: otp,
                route: 'otp',
                numbers: phone,
            },
        });
    }

    private async sendMsg91(phone: string, otp: string): Promise<void> {
        const apiKey = this.configService.get<string>('SMS_API_KEY');
        const templateId = this.configService.get<string>('MSG91_TEMPLATE_ID');
        if (!apiKey) return;

        const { default: axios } = await import('axios');
        await axios.post(
            'https://api.msg91.com/api/v5/otp',
            { template_id: templateId, mobile: `91${phone}`, otp },
            { headers: { authkey: apiKey, 'Content-Type': 'application/json' } },
        );
    }

    private async sendTwilio(phone: string, message: string): Promise<void> {
        const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
        const twilioPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

        if (!accountSid || !authToken || !twilioPhone) {
            this.logger.error('Twilio credentials missing in ENV. Falling back to console.');
            this.logger.log(`[SMS CONSOLE] To: ${phone} | Message: ${message}`);
            return;
        }

        try {
            const twilio = require('twilio')(accountSid, authToken);
            await twilio.messages.create({
                body: message,
                // Ensure international format by prepending + if it's purely digits
                to: phone.startsWith('+') ? phone : `+91${phone}`,
                from: twilioPhone
            });
            this.logger.log(`[TWILIO] SMS sent successfully to ${phone}`);
        } catch (error: any) {
            this.logger.error(`[TWILIO] Failed to send SMS: ${error.message}`);
            throw new Error('SMS Gateway Failed. Please try again.');
        }
    }
}
