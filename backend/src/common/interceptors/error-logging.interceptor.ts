import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip || request.connection.remoteAddress;

    return next.handle().pipe(
      catchError(error => {
        // Log detailed error information
        this.logger.error(`Request failed: ${method} ${url}`, {
          error: error.message,
          stack: error.stack,
          userAgent,
          ip,
          body: request.body,
          params: request.params,
          query: request.query,
          timestamp: new Date().toISOString(),
        });

        // Re-throw the error to be handled by other filters
        return throwError(() => error);
      }),
    );
  }
}
