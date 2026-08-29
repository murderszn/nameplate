import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(HttpException)
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();
    const detail = typeof body === 'string'
      ? body
      : typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message?: unknown }).message)
        : exception.message;
    const type = status === HttpStatus.UNAUTHORIZED
      ? 'https://api.nameplate.app/problems/unauthorized'
      : status === HttpStatus.FORBIDDEN
        ? 'https://api.nameplate.app/problems/forbidden'
        : `https://api.nameplate.app/problems/http-${status}`;
    response.status(status).type('application/problem+json').json({
      type,
      title: status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Request failed',
      status,
      detail,
      instance: request.originalUrl ?? request.url,
    });
  }
}
