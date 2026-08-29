import { ArgumentsHost, ForbiddenException } from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter';

describe('ProblemDetailsFilter', () => {
  it('emits RFC 9457-compatible permission problem details', () => {
    const payload: { status?: number; type?: string; body?: unknown; contentType?: string } = {};
    const response = {
      status: (status: number) => { payload.status = status; return response; },
      type: (type: string) => { payload.contentType = type; return response; },
      json: (body: unknown) => { payload.body = body; return response; },
    };
    const request = { originalUrl: '/v1/assets', url: '/v1/assets' };
    const host = {
      switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
    } as unknown as ArgumentsHost;
    new ProblemDetailsFilter().catch(new ForbiddenException('outside property scope'), host);
    expect(payload.status).toBe(403);
    expect(payload.contentType).toBe('application/problem+json');
    expect(payload.body).toMatchObject({ status: 403, title: 'Forbidden', detail: 'outside property scope', instance: '/v1/assets' });
  });
});
