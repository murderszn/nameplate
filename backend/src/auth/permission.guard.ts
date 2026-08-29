import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRequest } from './auth.types';
import { REQUIRED_PERMISSIONS_KEY, Permission } from './permissions.decorator';
import { roleHasPermissions } from './role-permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.membership || !roleHasPermissions(request.membership.role, required)) {
      throw new ForbiddenException('Insufficient organization permission');
    }
    return true;
  }
}
