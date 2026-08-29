import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  Matches,
  validateSync,
} from 'class-validator';

/**
 * Configuration accepted by the API. Secrets are deliberately not given
 * defaults: a missing database or Supabase issuer is a startup error.
 */
export class Environment {
  @IsString()
  @IsNotEmpty()
  @Matches(/^postgres(?:ql)?:\/\//, {
    message: 'DATABASE_URL must be a PostgreSQL connection URL',
  })
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  @Matches(/^postgres(?:ql)?:\/\//, {
    message: 'DIRECT_URL must be a PostgreSQL connection URL',
  })
  DIRECT_URL?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  SUPABASE_URL = 'http://localhost:54321';

  @IsOptional()
  @IsString()
  SUPABASE_JWT_AUDIENCE = 'authenticated';

  @IsOptional()
  @IsString()
  SUPABASE_JWT_ISSUER?: string;

  @IsOptional()
  @IsString()
  NODE_ENV = 'development';

  @IsOptional()
  @IsIn(['true', 'false'])
  AUTH_REQUIRED = 'true';

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  MEDIA_BUCKET = 'media';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  NPID_SIGNING_SECRET = 'local-nameplate-signing-secret';
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const values = plainToInstance(Environment, {
    ...config,
    PORT: config.PORT === undefined ? 3000 : Number(config.PORT),
  }, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(values, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  if (values.NODE_ENV === 'production' && !config.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is required in production');
  }
  if (values.NODE_ENV === 'production' && !config.CORS_ORIGINS) {
    throw new Error('CORS_ORIGINS is required in production');
  }
  if (values.NODE_ENV === 'production' && !config.NPID_SIGNING_SECRET) {
    throw new Error('NPID_SIGNING_SECRET is required in production');
  }

  return {
    ...config,
    PORT: values.PORT,
    SUPABASE_URL: values.SUPABASE_URL.replace(/\/$/, ''),
    SUPABASE_JWT_AUDIENCE: values.SUPABASE_JWT_AUDIENCE,
    SUPABASE_JWT_ISSUER:
      values.SUPABASE_JWT_ISSUER?.replace(/\/$/, '') ??
      `${values.SUPABASE_URL.replace(/\/$/, '')}/auth/v1`,
    NODE_ENV: values.NODE_ENV,
    AUTH_REQUIRED: values.AUTH_REQUIRED,
    DIRECT_URL: values.DIRECT_URL ?? values.DATABASE_URL,
    MEDIA_BUCKET: values.MEDIA_BUCKET,
    NPID_SIGNING_SECRET: values.NPID_SIGNING_SECRET,
  };
}
