import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { json } from 'express';
import { ErrorResponseDto } from './common/swagger/error-response.dto';
import {
  DraftResultResponseDto,
  TargetHuntResultResponseDto,
} from './game-runtime/presentation/dto/game-runtime-response.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(json({ limit: '1mb' }));

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Futz IQ API')
    .setDescription(
      [
        'Football knowledge and strategy game backend.',
        '',
        '**Headers**',
        '- `X-Participant-Id` — required on all `/game-sessions` routes (dev identity)',
        '- `Accept-Language` — `tr` or `en` (default `tr`); affects catalog titles and lineup slot labels',
        '',
        '**Client docs**',
        '- Flutter: `docs/flutter-integration.md`',
        '- Web (Nuxt): `docs/web-integration.md`',
        '',
        '**Results** use discriminated union: check `kind` (`TARGET_HUNT` | `DRAFT`).',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addTag('health', 'Liveness and database connectivity')
    .addTag('meta', 'Locales and i18n bundles')
    .addTag('game-families', 'Localized game catalog and capabilities manifest')
    .addTag('game-sessions', 'Session lifecycle, player search, actions, results')
    .addApiKey(
      { type: 'apiKey', name: 'X-Participant-Id', in: 'header' },
      'X-Participant-Id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [ErrorResponseDto, TargetHuntResultResponseDto, DraftResultResponseDto],
  });

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
