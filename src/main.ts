import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Express, Request, Response } from 'express';
import { AppModule } from './app.module';
import { json } from 'express';
import { ErrorResponseDto } from './common/swagger/error-response.dto';
import {
  DraftResultResponseDto,
  TargetHuntResultResponseDto,
} from './game-runtime/presentation/dto/game-runtime-response.dto';
import { setupDocsRoutes } from './docs';

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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          objectSrc: ["'none'"],
          connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          frameSrc: ["'self'", 'https://embed.figma.com', 'https://www.figma.com'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
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

  const expressApp = app.getHttpAdapter().getInstance() as Express;
  const swaggerPath = '/swagger';
  const swaggerJsonPath = '/swagger-json';
  const swaggerHtml = buildSwaggerHtml('Futz IQ API Docs', swaggerJsonPath);

  expressApp.get(swaggerJsonPath, (_req: Request, res: Response) => {
    res.json(document);
  });

  expressApp.get(swaggerPath, (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(swaggerHtml);
  });

  expressApp.get('/favicon.ico', (_req: Request, res: Response) => {
    res.redirect(302, `${SWAGGER_CDN}/favicon-32x32.png`);
  });

  setupDocsRoutes(expressApp, logger);

  logger.log(`Swagger docs available at ${swaggerPath}`);
  logger.log(`OpenAPI JSON available at ${swaggerJsonPath}`);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
