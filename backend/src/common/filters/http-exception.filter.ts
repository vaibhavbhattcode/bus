import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorDetails = typeof exceptionResponse === 'object' ? exceptionResponse : { message: exceptionResponse };

    // Log critical errors
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Internal Server Error: ${request.method} ${request.url}`, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`Client Error: ${request.method} ${request.url} - ${JSON.stringify(errorDetails)}`);
    }

    response
      .status(status)
      .json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...errorDetails,
      });
  }
}
