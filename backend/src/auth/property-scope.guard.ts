import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRequest } from './auth.types';
import { PROPERTY_SCOPE_KEY } from './permissions.decorator';
import { PropertyScopeService } from './property-scope.service';

@Injectable()
export class PropertyScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly scopes: PropertyScopeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const parameter = this.reflector.getAllAndOverride<string>(PROPERTY_SCOPE_KEY, [context.getHandler(), context.getClass()]);
    if (!parameter) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const propertyId = request.params?.[parameter] ?? request.query?.[parameter];
    if (typeof propertyId !== 'string' || !request.membership) {
      throw new ForbiddenException('A property scope is required');
    }
    await this.scopes.assertCanAccessProperty(request.membership, propertyId);
    return true;
  }
}
