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

// ─── Domain Interfaces ─────────────────────────────────────────────────────

/** Safe user object returned after login — no password hash */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: UserRole;
  createdAt?: Date;
  [key: string]: unknown; // allow additional DB fields
}

/** JWT access + refresh token pair */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/** Full login response returned to the controller */
export interface LoginResponse extends TokenPair {
  user: Omit<AuthenticatedUser, 'password'>;
}

/** TTL constants – single source of truth */
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';
const BCRYPT_SALT_ROUNDS = 12; // Increased from 10 for better security
const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes
const OTP_MAX_ATTEMPTS = 3; // Maximum wrong OTP attempts
const ABSOLUTE_SESSION_EXPIRY_DAYS = 30; // Force re-login after 30 days

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

  /** Generate access + refresh token pair with session tracking */
  public async getTokens(userId: string, email: string | null, role: string): Promise<TokenPair> {
    const payload = { sub: userId, email: email ?? '', role };
    const sessionStart = Math.floor(Date.now() / 1000);
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: ACCESS_TOKEN_EXPIRY }),
      this.jwtService.signAsync(
        { ...payload, sessionStart },
        {
          expiresIn: REFRESH_TOKEN_EXPIRY,
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            this.configService.get<string>('JWT_SECRET'),
        }
      ),
    ]);
    
    // Store refresh token in Redis for rotation tracking
    await this.redisService.set(
      `refresh:${userId}`,
      refreshToken,
      REFRESH_TOKEN_TTL_SECONDS
    );
    
    // Store session start time for absolute expiry
    await this.redisService.set(
      `session:${userId}`,
      sessionStart.toString(),
      ABSOLUTE_SESSION_EXPIRY_DAYS * 24 * 60 * 60
    );
    
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  /** Strip sensitive fields (e.g. password) from a user object */
  private sanitizeUser(user: Record<string, unknown>): AuthenticatedUser {
    const { password: _password, ...safe } = user;
    return safe as AuthenticatedUser;
  }

  // ─────────────────────────────────────────────────────────────
  //  Auth flows
  // ─────────────────────────────────────────────────────────────

  async validateUser(emailOrPhone: string, pass: string): Promise<AuthenticatedUser | null> {
    const user = await this.usersService.findByEmailOrPhone(emailOrPhone);
    if (user && (await bcrypt.compare(pass, user.password as string))) {
      return this.sanitizeUser(user as Record<string, unknown>);
    }
    return null;
  }

  async login(user: AuthenticatedUser): Promise<LoginResponse> {
    const tokens = await this.getTokens(
      user.id,
      user.email ?? null,
      user.role as string,
    );
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? null,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
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
    const hashedPassword = await bcrypt.hash(rest.password, BCRYPT_SALT_ROUNDS);
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

    const hashedPassword = await bcrypt.hash(userRest.password, BCRYPT_SALT_ROUNDS);
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
  //  Token Management with Rotation & Absolute Expiry
  // ─────────────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    // 1. Verify token signature
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

    const userId = payload.sub;

    // 2. Check if token matches stored token (rotation check)
    const storedToken = await this.redisService.get<string>(`refresh:${userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      // Token theft detected - invalidate all sessions
      await this.logoutAllSessions(userId);
      throw new UnauthorizedException('Token theft detected. All sessions have been logged out.');
    }

    // 3. Check absolute session expiry (30 days)
    const sessionStart = await this.redisService.get<string>(`session:${userId}`);
    if (sessionStart) {
      const sessionAge = Math.floor(Date.now() / 1000) - parseInt(sessionStart);
      const maxSessionAge = ABSOLUTE_SESSION_EXPIRY_DAYS * 24 * 60 * 60;
      
      if (sessionAge > maxSessionAge) {
        await this.logoutAllSessions(userId);
        throw new UnauthorizedException('Session expired. Please login again.');
      }
    }

    // 4. Verify user still exists and is active
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // 5. Invalidate old token and issue new pair (Token Rotation)
    await this.redisService.del(`refresh:${userId}`);
    
    return this.getTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });
      
      // Remove refresh token from Redis
      await this.redisService.del(`refresh:${payload.sub}`);
    } catch {
      // Token already invalid/expired
    }
    return { success: true, message: 'Logged out successfully' };
  }

  /** Logout all sessions for a user (security measure) */
  private async logoutAllSessions(userId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(`refresh:${userId}`),
      this.redisService.del(`session:${userId}`),
    ]);
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

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await this.usersService.updatePassword(userId, hashedPassword);

    // Invalidate the reset token immediately after use
    await this.redisService.del(`pwd_reset:${hashedToken}`);
    
    // Logout all sessions for security
    await this.logoutAllSessions(userId);

    return { success: true, message: 'Password has been reset successfully' };
  }
}
