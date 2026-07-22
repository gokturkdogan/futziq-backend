import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../football-data/infrastructure/prisma.service';
import { pickTranslation } from '../../common/locale/pick-translation';
import {
  GameCatalogRepository,
  GameFamilyDetailView,
  GameFamilySummaryView,
  ResolvedPlayConfig,
} from '../domain/game-catalog.repository';

@Injectable()
export class PrismaGameCatalogRepository implements GameCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActiveFamilies(locale: string): Promise<GameFamilySummaryView[]> {
    return this.prisma.gameFamily
      .findMany({
        where: { status: 'ACTIVE' },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          imageUrl: true,
          logoUrl: true,
          sortOrder: true,
          translations: {
            select: {
              locale: true,
              title: true,
              description: true,
            },
          },
        },
      })
      .then((families) =>
        families.map((family) => {
          const localized = pickTranslation(family.translations, locale, {
            title: family.title,
            description: family.description,
          });

          return {
            id: family.id,
            code: family.code,
            title: localized.title,
            description: localized.description,
            imageUrl: family.imageUrl,
            logoUrl: family.logoUrl,
            sortOrder: family.sortOrder,
          };
        }),
      );
  }

  async findFamilyByCode(code: string, locale: string): Promise<GameFamilyDetailView | null> {
    const family = await this.prisma.gameFamily.findFirst({
      where: { code, status: 'ACTIVE' },
      include: {
        translations: true,
        games: {
          where: { status: 'ACTIVE' },
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
          include: {
            translations: true,
            scopeRules: {
              where: { status: 'ACTIVE' },
              orderBy: [{ sortOrder: 'asc' }],
              include: {
                scope: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!family) {
      return null;
    }

    const familyLocalized = pickTranslation(family.translations, locale, {
      title: family.title,
      description: family.description,
    });

    return {
      id: family.id,
      code: family.code,
      title: familyLocalized.title,
      description: familyLocalized.description,
      imageUrl: family.imageUrl,
      logoUrl: family.logoUrl,
      sortOrder: family.sortOrder,
      games: family.games.map((game) => {
        const gameLocalized = pickTranslation(game.translations, locale, {
          title: game.title,
          description: game.description,
        });

        return {
          id: game.id,
          code: game.code,
          title: gameLocalized.title,
          description: gameLocalized.description,
          imageUrl: game.imageUrl,
          bannerImageUrl: game.bannerImageUrl,
          sortOrder: game.sortOrder,
          requiresScope: game.requiresScope,
          scopes: game.requiresScope
            ? game.scopeRules.map((rule) => {
                const scopeLocalized = pickTranslation(rule.scope.translations, locale, {
                  title: rule.scope.title,
                  description: rule.scope.description,
                });

                return {
                  id: rule.scope.id,
                  code: rule.scope.code,
                  title: scopeLocalized.title,
                  description: scopeLocalized.description,
                  imageUrl: rule.scope.imageUrl,
                  sortOrder: rule.sortOrder,
                };
              })
            : null,
        };
      }),
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
