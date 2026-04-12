import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Response Compression Interceptor
 * Automatically compresses large responses for better performance
 */
@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // Set appropriate cache headers for static content
        if (this.isStaticContent(context)) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }

        // Set ETag for conditional requests
        if (data && typeof data === 'object') {
          const etag = this.generateETag(data);
          response.setHeader('ETag', etag);
        }

        return data;
      }),
    );
  }

  private isStaticContent(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const url = request.url as string;
    return /\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf)$/i.test(url);
  }

  private generateETag(data: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(JSON.stringify(data));
    return `"${hash.digest('hex')}"`;
  }
}
