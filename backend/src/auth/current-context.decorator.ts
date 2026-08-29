import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { AuthRequest, MembershipContext, AuthenticatedUser } from './auth.types';

function requestFrom(context: ExecutionContext): AuthRequest {
  return context.switchToHttp().getRequest<AuthRequest>();
}

export const CurrentOrg = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const orgId = requestFrom(context).orgId;
  if (!orgId) throw new ForbiddenException('Active organization context is required');
  return orgId;
});

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const user = requestFrom(context).auth;
  if (!user) throw new ForbiddenException('Authenticated user context is required');
  return user;
});

export const CurrentMembership = createParamDecorator((_data: unknown, context: ExecutionContext): MembershipContext => {
  const membership = requestFrom(context).membership;
  if (!membership) throw new ForbiddenException('Active membership context is required');
  return membership;
});
