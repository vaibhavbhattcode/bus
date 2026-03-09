import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ProvidersService } from '../providers/providers.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { RegisterPassengerDto } from './dto/register-passenger.dto';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, UserRole } from 'prisma-client-custom';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';

/** TTL constants – single source of truth */
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private providersService: ProvidersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    private redisService: RedisService,
  ) { }

  // ─────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────

  /** Generate access + refresh token pair */
  public async getTokens(userId: string, email: string | null, role: string) {
    const payload = { sub: userId, email: email ?? '', role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: ACCESS_TOKEN_EXPIRY }),
      this.jwtService.signAsync(payload, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      }),
    ]);
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  /** Strip sensitive fields from user object */
  private sanitizeUser(user: Record<string, any>) {
    const { password, ...safe } = user;
    return safe;
  }

  // ─────────────────────────────────────────────────────────────
  //  Auth flows
  // ─────────────────────────────────────────────────────────────

  async validateUser(emailOrPhone: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmailOrPhone(emailOrPhone);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return this.sanitizeUser(user as Record<string, any>);
    }
    return null;
  }

  async login(user: any) {
    const tokens = await this.getTokens(user.id, user.email, user.role);
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    await Promise.allSettled([
      this.notificationsService.create(
        user.id,
        NotificationType.SYSTEM,
        'Welcome!',
        'Welcome to Bus Booking! We are glad to have you.',
        '/profile',
      ),
      user.email
        ? this.mailService.sendWelcomeEmail(user.email, user.name)
        : Promise.resolve(),
    ]);

    return this.sanitizeUser(user as Record<string, any>);
  }

  async registerPassenger(dto: RegisterPassengerDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const { confirmPassword, ...rest } = dto;
    const hashedPassword = await bcrypt.hash(rest.password, 12);
    const payload: any = {
      ...rest,
      password: hashedPassword,
      role: UserRole.PASSENGER,
      dateOfBirth: rest.dateOfBirth ? new Date(rest.dateOfBirth) : undefined,
      email: rest.email || undefined,
      alternatePhone: rest.alternatePhone || undefined,
    };

    // Parallel duplicate checks
    const [existingPhone, existingEmail] = await Promise.all([
      this.usersService.findByEmailOrPhone(payload.phone),
      payload.email ? this.usersService.findByEmail(payload.email) : null,
    ]);

    if (existingPhone) {
      throw new BadRequestException('User with this phone number already exists');
    }
    if (existingEmail) {
      throw new BadRequestException('User with this email already exists');
    }

    const user = await this.usersService.create(payload);

    await Promise.allSettled([
      this.notificationsService.create(
        user.id,
        NotificationType.SYSTEM,
        'Welcome!',
        'Welcome to BusBook. You can now search routes and book tickets.',
        '/profile',
      ),
      user.email
        ? this.mailService.queueWelcomeEmail(user.email, user.name)
        : Promise.resolve(),
    ]);

    const tokens = await this.getTokens(user.id, user.email, user.role);
    return { ...tokens, user: this.sanitizeUser(user as Record<string, any>) };
  }

  async registerProvider(dto: RegisterProviderDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const {
      confirmPassword,
      companyName,
      contactName,
      contactPhone,
      contactEmail,
      address,
      city,
      state,
      pincode,
      ...userRest
    } = dto;

    const hashedPassword = await bcrypt.hash(userRest.password, 12);
    const user = await this.usersService.create({
      ...userRest,
      password: hashedPassword,
      role: UserRole.PROVIDER,
    });

    await this.providersService.create(user.id, {
      companyName,
      contactName,
      contactPhone,
      contactEmail: contactEmail || user.email || undefined,
      address,
      city,
      state,
      pincode,
    });

    await Promise.allSettled([
      this.notificationsService.create(
        user.id,
        NotificationType.SYSTEM,
        'Welcome!',
        'Your provider account is set up. Add vehicles and routes to get started.',
        '/provider/dashboard',
      ),
      user.email
        ? this.mailService.queueWelcomeEmail(user.email, user.name)
        : Promise.resolve(),
    ]);

    const tokens = await this.getTokens(user.id, user.email, user.role);
    return { ...tokens, user: this.sanitizeUser(user as Record<string, any>) };
  }

  // ─────────────────────────────────────────────────────────────
  //  Token Management
  // ─────────────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    // 1. Check blacklist
    const isBlacklisted = await this.redisService.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // 2. Blacklist old refresh token (Token Rotation – prevents replay attacks)
    await this.blacklistToken(refreshToken, payload.exp);

    // 3. Issue new token pair
    return this.getTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });
      await this.blacklistToken(refreshToken, payload.exp);
    } catch {
      // Expired/invalid tokens are effectively logged out already
    }
    return { success: true, message: 'Logged out successfully' };
  }

  /** Store a token in Redis blacklist until its natural expiry */
  private async blacklistToken(token: string, exp: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttl = exp - now;
    if (ttl > 0) {
      await this.redisService.set(`blacklist:${token}`, 'true', ttl);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Password Reset
  // ─────────────────────────────────────────────────────────────

  async forgotPassword({ email }: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(email);

    // Always return success to prevent user enumeration attacks
    if (!user) {
      return { success: true, message: 'If this email exists, a reset link has been sent.' };
    }

    // Generate a cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.redisService.set(
      `pwd_reset:${hashedToken}`,
      user.id,
      RESET_TOKEN_TTL_SECONDS,
    );

    await this.mailService.sendPasswordResetEmail(email, user.name, rawToken);

    return { success: true, message: 'If this email exists, a reset link has been sent.' };
  }

  async resetPassword({ token, password }: ResetPasswordDto) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const userId = await this.redisService.get<string>(`pwd_reset:${hashedToken}`);

    if (!userId) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const hashedPassword = await bcrypt.hash(password, 12);
    await this.usersService.updatePassword(userId, hashedPassword);

    // Invalidate the reset token immediately after use
    await this.redisService.del(`pwd_reset:${hashedToken}`);

    return { success: true, message: 'Password has been reset successfully' };
  }
}
