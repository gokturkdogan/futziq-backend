import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Express, Request, Response } from 'express';
import express = require('express');
import type { INestApplication } from '@nestjs/common';

import { AppModule } from './app.module';
import { ErrorResponseDto } from './common/swagger/error-response.dto';
import { setupDocsRoutes } from './docs';
import {
  DraftResultResponseDto,
  TargetHuntResultResponseDto,
} from './game-runtime/presentation/dto/game-runtime-response.dto';

const SWAGGER_CDN = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5';

const buildSwaggerHtml = (title: string, openApiJsonPath: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="${SWAGGER_CDN}/swagger-ui.css" />
    <link rel="icon" type="image/png" sizes="32x32" href="${SWAGGER_CDN}/favicon-32x32.png" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_CDN}/swagger-ui-bundle.js" crossorigin></script>
    <script src="${SWAGGER_CDN}/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.addEventListener('load', () => {
        window.ui = SwaggerUIBundle({
          url: '${openApiJsonPath}',
          dom_id: '#swagger-ui',
          deepLinking: true,
          persistAuthorization: true,
          layout: 'StandaloneLayout',
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        });
      });
    </script>
  </body>
</html>
`;

/**
 * Shared bootstrap for `main.ts` (listen) and `serverless.ts` (Vercel).
 * When `expressApp` is passed (serverless), routes mount on that instance before
 * `init()` — same pattern as lineup-api.
 */
export const createApp = async (expressApp?: Express): Promise<INestApplication> => {
  const isServerless = Boolean(process.env.VERCEL);
  const logger = new Logger('Bootstrap');

  const app = expressApp
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
        bufferLogs: !isServerless,
      })
    : await NestFactory.create(AppModule, { bufferLogs: !isServerless });

  if (isServerless) {
    app.useLogger(new ConsoleLogger());
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://vercel.live'],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          objectSrc: ["'none'"],
          connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://vercel.live'],
          frameSrc: ["'self'", 'https://embed.figma.com', 'https://www.figma.com', 'https://vercel.live'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

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
        '**Integration docs**',
        '- Browser: `/docs`',
        '- Flutter & Web guides linked from docs index',
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

  const expressInstance = app.getHttpAdapter().getInstance() as Express;
  const swaggerPath = '/swagger';
  const swaggerJsonPath = '/swagger-json';
  const swaggerHtml = buildSwaggerHtml('Futz IQ API Docs', swaggerJsonPath);

  const serveSwaggerJson = (_req: Request, res: Response): void => {
    res.json(document);
  };

  const serveSwaggerHtml = (_req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(swaggerHtml);
  };

  expressInstance.get(swaggerJsonPath, serveSwaggerJson);
  expressInstance.get(swaggerPath, serveSwaggerHtml);
  expressInstance.get('/api/docs-json', serveSwaggerJson);
  expressInstance.get('/api/docs', serveSwaggerHtml);
  expressInstance.get('/api/docs/', (_req: Request, res: Response) => {
    res.redirect(301, swaggerPath);
  });
  expressInstance.get('/favicon.ico', (_req: Request, res: Response) => {
    res.redirect(302, `${SWAGGER_CDN}/favicon-32x32.png`);
  });

  setupDocsRoutes(expressInstance, logger);

  logger.log(`Swagger docs available at ${swaggerPath} (legacy: /api/docs)`);
  logger.log(`OpenAPI JSON available at ${swaggerJsonPath} (legacy: /api/docs-json)`);

  return app;
};

export const createExpressApp = (): Express => express();
