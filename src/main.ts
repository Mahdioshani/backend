import * as Sentry from '@sentry/node';
import { CoreModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { LogLevel, VersioningType } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(CoreModule, {
    cors: {
      origin: "*",
      credentials: true
    }
  });

  const configService = app.get<ConfigService>(ConfigService)

  const LOG_LEVEL = configService.get<LogLevel>('LOG_LEVEL');
  const SENTRY_DSN = configService.get<string>('SENTRY_DSN');
  const ENVIRONMENT = configService.get<string>('NODE_ENV');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [configService.get<string>('NATS_URL') + ":" + configService.get<string>('NATS_PORT')],
    },
  });

  Sentry.init({
    enabled: ENVIRONMENT !== 'development',
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
  });

  if (LOG_LEVEL?.length > 0) {
    app.useLogger([LOG_LEVEL]);
  }

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  await app.startAllMicroservices();
  await app.listen(3000, '0.0.0.0');
}

bootstrap()