import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * 
 * How it works:
 * 1. Generates a CSRF token and stores it in a cookie
 * 2. Requires the token to be sent in request headers for state-changing operations
 * 3. Validates the token matches the cookie value
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly CSRF_COOKIE_NAME = 'XSRF-TOKEN';
  private readonly CSRF_HEADER_NAME = 'x-xsrf-token';
  private readonly TOKEN_LENGTH = 32;

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      // Generate and set CSRF token for safe requests
      if (!req.cookies[this.CSRF_COOKIE_NAME]) {
        const token = this.generateToken();
        res.cookie(this.CSRF_COOKIE_NAME, token, {
          httpOnly: false, // Must be readable by JavaScript
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
      }
      return next();
    }

    // For state-changing methods, validate CSRF token
    const cookieToken = req.cookies[this.CSRF_COOKIE_NAME];
    const headerToken = req.headers[this.CSRF_HEADER_NAME] as string;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.secureCompare(cookieToken, headerToken)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    next();
  }

  private generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
