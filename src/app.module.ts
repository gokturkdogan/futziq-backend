import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { FootballDataModule } from './football-data/football-data.module';
import { GameCatalogModule } from './game-catalog/game-catalog.module';
import { GameEngineModule } from './game-engine/game-engine.module';
import { GameRuntimeModule } from './game-runtime/game-runtime.module';
import { MetaModule } from './meta/meta.module';
import { HealthController } from './health/health.controller';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { LocaleInterceptor } from './common/locale/locale.interceptor';
import { TraceIdMiddleware } from './common/logging/trace-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10) * 1000,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT ?? '100', 10),
      },
    ]),
    FootballDataModule,
    GameCatalogModule,
    GameEngineModule,
    GameRuntimeModule,
    MetaModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LocaleInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
