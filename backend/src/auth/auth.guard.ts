import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { NameplateConfig } from '../config/configuration';
import type { AuthRequest } from './auth.types';
import { SupabaseJwtService } from './supabase-jwt.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: SupabaseJwtService,
    private readonly config: ConfigService<NameplateConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authRequired = this.config.get('authRequired', { infer: true }) ?? true;
    if (!authRequired) return true;
    // Keep the existing root endpoint usable as a liveness check. All data
    // routes remain protected and do not rely on this exception.
    if (request.method === 'GET' && request.path === '/') return true;

    const header = request.header('authorization');
    const match = header?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException('Bearer token is required');
    const claims = await this.jwt.verify(match[1]);
    request.auth = { id: claims.sub, email: claims.email, claims };
    return true;
  }
}
