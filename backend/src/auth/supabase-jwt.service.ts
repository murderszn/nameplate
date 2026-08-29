import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import type { NameplateConfig } from '../config/configuration';
import type { SupabaseClaims } from './auth.types';

interface JsonWebKeySet {
  keys: Array<JsonWebKey & { kid?: string; alg?: string; use?: string }>;
}

const JOSE_DIGEST: Readonly<Record<string, string>> = {
  RS256: 'sha256',
  RS384: 'sha384',
  RS512: 'sha512',
  ES256: 'sha256',
  ES384: 'sha384',
  ES512: 'sha512',
};

function decodePart(part: string): Buffer {
  return Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='), 'base64');
}

function parseJson<T>(part: string): T {
  try {
    return JSON.parse(decodePart(part).toString('utf8')) as T;
  } catch {
    throw new UnauthorizedException('Malformed JWT');
  }
}

@Injectable()
export class SupabaseJwtService {
  private keySet?: JsonWebKeySet;
  private keySetExpiresAt = 0;

  constructor(private readonly config: ConfigService<NameplateConfig, true>) {}

  async verify(token: string): Promise<SupabaseClaims> {
    const segments = token.split('.');
    if (segments.length !== 3) throw new UnauthorizedException('Malformed JWT');

    const header = parseJson<{ alg?: string; kid?: string }>(segments[0]);
    const claims = parseJson<SupabaseClaims>(segments[1]);
    if (!claims.sub || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('JWT is expired or has no subject');
    }
    const issuer = this.config.get('supabaseJwtIssuer', { infer: true });
    const audience = this.config.get('supabaseJwtAudience', { infer: true });
    if (claims.iss !== issuer) throw new UnauthorizedException('JWT issuer is invalid');
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(audience)) throw new UnauthorizedException('JWT audience is invalid');
    if (!header.alg || !JOSE_DIGEST[header.alg]) {
      throw new UnauthorizedException('JWT algorithm is not allowed');
    }

    const key = await this.getKey(header.kid);
    const verificationKey = header.alg.startsWith('ES')
      ? { key, dsaEncoding: 'ieee-p1363' as const }
      : key;
    const valid = verifySignature(
      JOSE_DIGEST[header.alg],
      Buffer.from(`${segments[0]}.${segments[1]}`),
      verificationKey,
      decodePart(segments[2]),
    );
    if (!valid) throw new UnauthorizedException('JWT signature is invalid');
    return claims;
  }

  private async getKey(kid?: string): Promise<KeyObject> {
    const now = Date.now();
    if (!this.keySet || this.keySetExpiresAt <= now) {
      const jwksUrl = this.config.get('supabaseJwksUrl', { infer: true });
      let response: Response;
      try {
        response = await fetch(jwksUrl, { signal: AbortSignal.timeout(5000) });
      } catch {
        throw new UnauthorizedException('Unable to retrieve Supabase signing keys');
      }
      if (!response.ok) throw new UnauthorizedException('Unable to retrieve Supabase signing keys');
      this.keySet = (await response.json()) as JsonWebKeySet;
      this.keySetExpiresAt = now + 5 * 60 * 1000;
    }

    const jwk = this.keySet.keys.find((candidate) => (kid ? candidate.kid === kid : true));
    if (!jwk) throw new UnauthorizedException('JWT signing key is unknown');
    try {
      return createPublicKey({ key: jwk as any, format: 'jwk' });
    } catch {
      throw new UnauthorizedException('JWT signing key is invalid');
    }
  }
}
