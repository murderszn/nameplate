import type { Request } from 'express';

export interface SupabaseClaims {
  sub: string;
  email?: string;
  role?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
  claims: SupabaseClaims;
}

export interface MembershipContext {
  id: string;
  orgId: string;
  userId: string;
  role: string;
  status: string;
  propertyAssignments?: Array<{ propertyId: string }>;
}

export interface AuthRequest extends Request {
  auth?: AuthenticatedUser;
  membership?: MembershipContext;
  orgId?: string;
}
