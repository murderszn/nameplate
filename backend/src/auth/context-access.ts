import { ForbiddenException } from '@nestjs/common';
import type { MembershipContext } from './auth.types';
import { roleHasGlobalPropertyScope } from './role-permissions';

export function assignedPropertyIds(membership: MembershipContext): string[] | undefined {
  if (roleHasGlobalPropertyScope(membership.role)) return undefined;
  return (membership.propertyAssignments ?? []).map((assignment) => assignment.propertyId);
}

export function assertPropertyAccess(membership: MembershipContext, propertyId: string): void {
  const ids = assignedPropertyIds(membership);
  if (ids && !ids.includes(propertyId)) throw new ForbiddenException('Property is outside the membership scope');
}
