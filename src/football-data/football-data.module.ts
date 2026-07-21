import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../football-data/infrastructure/prisma.service';
import { PrismaFootballDataRepository } from '../football-data/infrastructure/prisma-football-data.repository';
import { FOOTBALL_DATA_REPOSITORY } from './domain/football-data.repository';
import { PositionNormalizerService } from './application/position-normalizer.service';

@Module({
  providers: [
    PrismaService,
    PositionNormalizerService,
    {
      provide: FOOTBALL_DATA_REPOSITORY,
      useClass: PrismaFootballDataRepository,
    },
  ],
  exports: [PrismaService, FOOTBALL_DATA_REPOSITORY, PositionNormalizerService],
})
export class FootballDataModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }
}
