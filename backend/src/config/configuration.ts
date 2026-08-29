export interface NameplateConfig {
  databaseUrl: string;
  directUrl: string;
  port: number;
  supabaseUrl: string;
  supabaseJwtAudience: string;
  supabaseJwtIssuer: string;
  supabaseJwksUrl: string;
  authRequired: boolean;
  mediaBucket: string;
  npidSigningSecret: string;
  nodeEnv: string;
  corsOrigins: string[];
}

export default (): NameplateConfig => {
  const supabaseUrl = String(process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const issuer = String(
    process.env.SUPABASE_JWT_ISSUER ?? `${supabaseUrl}/auth/v1`,
  ).replace(/\/$/, '');

  return {
    databaseUrl: String(process.env.DATABASE_URL),
    directUrl: String(process.env.DIRECT_URL ?? process.env.DATABASE_URL),
    port: Number(process.env.PORT ?? 3000),
    supabaseUrl,
    supabaseJwtAudience: String(
      process.env.SUPABASE_JWT_AUDIENCE ?? 'authenticated',
    ),
    supabaseJwtIssuer: issuer,
    supabaseJwksUrl: `${issuer}/.well-known/jwks.json`,
    authRequired: process.env.AUTH_REQUIRED !== 'false',
    mediaBucket: String(process.env.MEDIA_BUCKET ?? 'media'),
    npidSigningSecret: String(
      process.env.NPID_SIGNING_SECRET ?? 'local-nameplate-signing-secret',
    ),
    nodeEnv: String(process.env.NODE_ENV ?? 'development'),
    corsOrigins: String(process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:3000')
      .split(',').map((origin) => origin.trim()).filter(Boolean),
  };
};
