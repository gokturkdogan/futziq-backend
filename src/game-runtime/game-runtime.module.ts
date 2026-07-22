import { Module } from '@nestjs/common';
import { GAME_SESSION_REPOSITORY } from './domain/game-session.repository';
import { PrismaGameSessionRepository } from './infrastructure/prisma-game-session.repository';
import { GameRuntimeService } from './application/game-runtime.service';
import { DraftRoundScopeService } from './application/draft-round-scope.service';
import { SessionOrchestrator } from './application/session-orchestrator.service';
import { GameSessionsController } from './presentation/game-sessions.controller';
import { FootballDataModule } from '../football-data/football-data.module';
import { GameCatalogModule } from '../game-catalog/game-catalog.module';
import { GameEngineModule } from '../game-engine/game-engine.module';
import { IDENTITY_PROVIDER } from '../common/security/identity.provider';
import { DevelopmentIdentityProvider } from '../common/security/development-identity.provider';
import { REDIS_CLIENT, NoOpRedisClient } from '../common/security/redis.client';

@Module({
  imports: [FootballDataModule, GameCatalogModule, GameEngineModule],
  controllers: [GameSessionsController],
  providers: [
    GameRuntimeService,
    SessionOrchestrator,
    DraftRoundScopeService,
    { provide: GAME_SESSION_REPOSITORY, useClass: PrismaGameSessionRepository },
    { provide: IDENTITY_PROVIDER, useClass: DevelopmentIdentityProvider },
    { provide: REDIS_CLIENT, useClass: NoOpRedisClient },
  ],
  exports: [GameRuntimeService, GAME_SESSION_REPOSITORY, IDENTITY_PROVIDER],
})
export class GameRuntimeModule {}
