import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard API Response Format
 * Success: { success: true, data: T, meta: { timestamp, requestId } }
 * Error: handled by GlobalExceptionFilter
 */
export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    const requestId = uuidv4();
    const request = context.switchToHttp().getRequest();
    
    // Attach requestId to request for logging/tracing
    request.requestId = requestId;

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      })),
    );
  }
}
