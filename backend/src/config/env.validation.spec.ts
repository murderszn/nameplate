import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('normalizes a local Supabase URL and derives issuer', () => {
    const config = validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/nameplate',
      SUPABASE_URL: 'http://localhost:54321/',
      PORT: '3100',
    });
    expect(config.SUPABASE_URL).toBe('http://localhost:54321');
    expect(config.SUPABASE_JWT_ISSUER).toBe('http://localhost:54321/auth/v1');
    expect(config.PORT).toBe(3100);
  });

  it('rejects an invalid database URL contract', () => {
    expect(() => validateEnvironment({ SUPABASE_URL: 'http://localhost:54321' })).toThrow(
      'Invalid environment configuration',
    );
  });
});
