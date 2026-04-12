import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID Middleware
 * 
 * Attaches a unique request ID to each incoming request for distributed tracing.
 * This enables correlation of logs across services and helps debug issues.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Use existing request ID from header (for service-to-service calls) or generate new
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    
    // Attach to request object for access in controllers/services
    (req as any).requestId = requestId;
    
    // Add to response headers for client-side tracing
    res.setHeader('X-Request-Id', requestId);
    
    next();
  }
}
