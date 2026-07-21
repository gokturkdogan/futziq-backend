import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../football-data/infrastructure/prisma.service';
import {
  GameCatalogRepository,
  GameFamilyDetailView,
  GameFamilySummaryView,
  ResolvedPlayConfig,
} from '../domain/game-catalog.repository';

@Injectable()
export class PrismaGameCatalogRepository implements GameCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActiveFamilies(): Promise<GameFamilySummaryView[]> {
    return this.prisma.gameFamily.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        sortOrder: true,
      },
    });
  }

  async findFamilyByCode(code: string): Promise<GameFamilyDetailView | null> {
    const family = await this.prisma.gameFamily.findFirst({
      where: { code, status: 'ACTIVE' },
      include: {
        games: {
          where: { status: 'ACTIVE' },
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
          include: {
            scopeRules: {
              where: { status: 'ACTIVE' },
              orderBy: [{ sortOrder: 'asc' }],
              include: {
                scope: true,
              },
            },
          },
        },
      },
    });

    if (!family) {
      return null;
    }

    return {
      id: family.id,
      code: family.code,
      title: family.title,
      description: family.description,
      sortOrder: family.sortOrder,
      games: family.games.map((game) => ({
        id: game.id,
        code: game.code,
        title: game.title,
        description: game.description,
        sortOrder: game.sortOrder,
        requiresScope: game.requiresScope,
        scopes: game.requiresScope
          ? game.scopeRules.map((rule) => ({
              id: rule.scope.id,
              code: rule.scope.code,
              title: rule.scope.title,
              description: rule.scope.description,
              sortOrder: rule.sortOrder,
            }))
          : null,
      })),
    };
  }

  async resolvePlayConfig(input: {
    familyCode: string;
    gameCode: string;
    scopeCode?: string;
  }): Promise<ResolvedPlayConfig | null> {
    const game = await this.prisma.game.findFirst({
      where: {
        code: input.gameCode,
        status: 'ACTIVE',
        family: { code: input.familyCode, status: 'ACTIVE' },
      },
      include: {
        family: true,
        scopeRules: {
          where: { status: 'ACTIVE' },
          include: { scope: true },
        },
      },
    });

    if (!game) {
      return null;
    }

    if (!game.requiresScope) {
      if (!game.config) {
        return null;
      }

      return {
        familyCode: game.family.code,
        gameId: game.id,
        gameCode: game.code,
        scopeId: null,
        scopeCode: null,
        gameScopeRuleId: null,
        config: game.config,
      };
    }

    if (!input.scopeCode) {
      return null;
    }

    const rule = game.scopeRules.find((item) => item.scope.code === input.scopeCode);
    if (!rule) {
      return null;
    }

    return {
      familyCode: game.family.code,
      gameId: game.id,
      gameCode: game.code,
      scopeId: rule.scope.id,
      scopeCode: rule.scope.code,
      gameScopeRuleId: rule.id,
      config: rule.config,
    };
  }
}
