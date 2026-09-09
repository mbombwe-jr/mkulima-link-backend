import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const source = typeof body === 'object' && body !== null ? (body as Record<string, any>) : {};
    const validation = Array.isArray(source.message) ? source.message.join(', ') : undefined;
    response.status(status).json({
      error: {
        code: source.code ?? (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'),
        message: validation ?? source.message ?? (typeof body === 'string' ? body : 'Request failed'),
        detail: source.detail,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
