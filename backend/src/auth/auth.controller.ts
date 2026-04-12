import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterPassengerDto } from './dto/register-passenger.dto';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

// Secure cookie options – same across all auth endpoints
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,           // Not accessible via document.cookie
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Protects against CSRF for most cases
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',        // Scoped to auth routes only
};

const REFRESH_COOKIE_NAME = 'refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private otpService: OtpService,
  ) { }

  // ─── Helper: extract refresh token from cookie OR body (backward compat) ───
  private extractRefreshToken(req: Request, bodyToken?: string): string | undefined {
    return (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) ?? bodyToken;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @ApiOperation({ summary: 'Login with email/phone and password' })
  @ApiResponse({ status: 200, description: 'Returns access_token and user. Refresh token set in httpOnly cookie.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.emailOrPhone,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user);

    // Set refresh token as secure httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refresh_token, REFRESH_COOKIE_OPTIONS);

    // Return only the access token + user in the body
    const { refresh_token, ...safeResponse } = result;
    return safeResponse;
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user (generic)' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register/passenger')
  @ApiOperation({ summary: 'Register a new passenger account' })
  async registerPassenger(
    @Body() dto: RegisterPassengerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerPassenger(dto);

    res.cookie(REFRESH_COOKIE_NAME, result.refresh_token, REFRESH_COOKIE_OPTIONS);

    const { refresh_token, ...safeResponse } = result;
    return safeResponse;
  }

  @Post('register/provider')
  @ApiOperation({ summary: 'Register a new transport provider account' })
  async registerProvider(
    @Body() dto: RegisterProviderDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerProvider(dto);

    res.cookie(REFRESH_COOKIE_NAME, result.refresh_token, REFRESH_COOKIE_OPTIONS);

    const { refresh_token, ...safeResponse } = result;
    return safeResponse;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token. Reads refresh token from httpOnly cookie.' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const refreshToken = this.extractRefreshToken(req, bodyToken);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const result = await this.authService.refreshTokens(refreshToken);

    // Rotate cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refresh_token, REFRESH_COOKIE_OPTIONS);

    const { refresh_token, ...safeResponse } = result;
    return safeResponse;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token. Clears httpOnly cookie.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ) {
    const refreshToken = this.extractRefreshToken(req, bodyToken);

    // Always clear the cookie regardless
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });

    if (!refreshToken) {
      return { success: true, message: 'Logged out successfully' };
    }
    return this.authService.logout(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset link sent (always returns success to prevent user enumeration)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get currently authenticated user info' })
  async me(@Req() req: any) {
    return {
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      phone: req.user?.phone,
      role: req.user?.role,
    };
  }

  // ─────────────────────────────────────────────────────────────
  //  OTP Phone Login
  // ─────────────────────────────────────────────────────────────

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 OTP requests per minute
  @ApiOperation({ summary: 'Send OTP to phone number for passwordless login' })
  @ApiResponse({ status: 200, description: 'OTP sent (rate-limited)' })
  async sendOtp(@Body('phone') phone: string) {
    if (!phone) throw new UnauthorizedException('Phone number is required');
    return this.otpService.sendOtp(phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 verify attempts per minute
  @ApiOperation({ summary: 'Verify OTP and receive JWT tokens (creates account if new user)' })
  @ApiResponse({ status: 200, description: 'Returns accessToken, user info, and isNewUser flag. Refresh token in httpOnly cookie.' })
  async verifyOtp(
    @Body('phone') phone: string,
    @Body('otp') otp: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!phone || !otp) throw new UnauthorizedException('Phone and OTP are required');
    const result = await this.otpService.verifyOtp(phone, otp);

    if (result.refreshToken) {
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
      const { refreshToken, ...safeResponse } = result;
      return safeResponse;
    }
    return result;
  }
}
