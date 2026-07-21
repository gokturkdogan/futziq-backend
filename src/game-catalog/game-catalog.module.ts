import { Module } from '@nestjs/common';
import { GAME_CATALOG_REPOSITORY } from './domain/game-catalog.repository';
import { PrismaGameCatalogRepository } from './infrastructure/prisma-game-catalog.repository';
import { GameCatalogService } from './application/game-catalog.service';
import { GameFamiliesController } from './presentation/game-families.controller';
import { FootballDataModule } from '../football-data/football-data.module';

@Module({
  imports: [FootballDataModule],
  controllers: [GameFamiliesController],
  providers: [
    GameCatalogService,
    {
      provide: GAME_CATALOG_REPOSITORY,
      useClass: PrismaGameCatalogRepository,
    },
  ],
  exports: [GameCatalogService, GAME_CATALOG_REPOSITORY],
})
export class GameCatalogModule {}
