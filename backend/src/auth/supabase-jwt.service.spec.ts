import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, sign } from 'node:crypto';
import { SupabaseJwtService } from './supabase-jwt.service';

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('SupabaseJwtService', () => {
  const issuer = 'https://nameplate.example/auth/v1';
  const audience = 'authenticated';
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('verifies a Supabase-compatible RS256 token against JWKS', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const kid = 'nameplate-test-key';
    const jwk = publicKey.export({ format: 'jwk' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] }),
    });

    const header = encode({ alg: 'RS256', kid, typ: 'JWT' });
    const payload = encode({
      sub: '9dfd1cf6-fbd8-4f12-8f22-28bf678c85b0',
      iss: issuer,
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 300,
      email: 'tech@nameplate.example',
    });
    const signingInput = `${header}.${payload}`;
    const signature = sign('sha256', Buffer.from(signingInput), privateKey).toString(
      'base64url',
    );

    const config = new ConfigService({
      supabaseJwtIssuer: issuer,
      supabaseJwtAudience: audience,
      supabaseJwksUrl: `${issuer}/.well-known/jwks.json`,
    });
    const claims = await new SupabaseJwtService(config as never).verify(
      `${signingInput}.${signature}`,
    );

    expect(claims.email).toBe('tech@nameplate.example');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
