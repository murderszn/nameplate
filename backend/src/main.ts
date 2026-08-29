import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { NameplateConfig } from './config/configuration';

// Prisma BigInt columns (change_seq) aren't JSON-serializable by default —
// this lets Nest's JSON responses render them as strings instead of 500ing.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // architecture.md §3: DTOs double as OpenAPI schema via class-validator.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = app.get(ConfigService<NameplateConfig, true>);
  app.enableCors({ origin: config.get('corsOrigins', { infer: true }) });
  await app.listen(config.get('port', { infer: true }));
}
bootstrap();
