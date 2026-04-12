import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * Global Exception Filter
 * Standardizes all error responses and logs them appropriately
 * Format: { success: false, error: { code, message, details? }, meta: { timestamp, requestId } }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Extract error details
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails: any = undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      errorCode = responseObj.code || responseObj.error || this.getDefaultErrorCode(status);
      errorMessage = responseObj.message || errorMessage;
      
      // Include validation errors or additional details
      if (responseObj.message && Array.isArray(responseObj.message)) {
        errorDetails = responseObj.message;
      } else if (responseObj.details) {
        errorDetails = responseObj.details;
      }
    } else {
      errorMessage = String(exceptionResponse);
    }

    const requestId = request.requestId || 'unknown';

    // Log errors appropriately
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status} ${errorCode}`,
        exception instanceof Error ? exception.stack : String(exception)
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status} ${errorCode}: ${errorMessage}`
      );
    }

    // Build standardized error response
    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: this.isProduction && status === 500 
          ? 'An unexpected error occurred. Please try again later.'
          : errorMessage,
        // Only include details in development or for client errors
        ...((!this.isProduction || status < 500) && errorDetails ? { details: errorDetails } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    response.status(status).json(errorResponse);
  }

  private getDefaultErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }
}
