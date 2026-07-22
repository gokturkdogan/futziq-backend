import { PrismaClient } from '@prisma/client';
import { SUPPORTED_LOCALES } from '../src/common/locale/locale.constants';
import { GameFamily } from '../src/game-engine/contracts/game-types';
import { RANDOM_SCOPE_CODE } from '../src/game-catalog/domain/catalog.constants';
import {
  RANDOM_GAME_SCOPE,
  TargetHuntGameCode,
  buildTargetHuntScopeRuleConfig,
  getDefaultLocaleText,
} from './catalog-seed';

/**
 * Adds or updates only the RANDOM catalog scope and its Target Hunt scope rules.
 * Does not modify families, games, playable scopes, media URLs, or existing rule configs.
 */
export async function seedRandomScope(prisma: PrismaClient) {
  const defaultText = getDefaultLocaleText(RANDOM_GAME_SCOPE.translations);

  const scope = await prisma.gameScope.upsert({
    where: { code: RANDOM_SCOPE_CODE },
    create: {
      code: RANDOM_SCOPE_CODE,
      title: defaultText.title,
      description: defaultText.description,
      imageUrl: null,
      sortOrder: RANDOM_GAME_SCOPE.sortOrder,
      status: 'ACTIVE',
    },
    update: {
      title: defaultText.title,
      description: defaultText.description,
      imageUrl: null,
      sortOrder: RANDOM_GAME_SCOPE.sortOrder,
      status: 'ACTIVE',
    },
  });

  for (const locale of SUPPORTED_LOCALES) {
    const text = RANDOM_GAME_SCOPE.translations[locale];
    await prisma.gameScopeTranslation.upsert({
      where: { scopeId_locale: { scopeId: scope.id, locale } },
      update: {
        title: text.title,
        description: text.description,
      },
      create: {
        scopeId: scope.id,
        locale,
        title: text.title,
        description: text.description,
      },
    });
  }

  const family = await prisma.gameFamily.findUnique({
    where: { code: GameFamily.TARGET_HUNT },
    select: { id: true },
  });

  if (!family) {
    throw new Error('TARGET_HUNT family not found. Run migrations first.');
  }

  const games = await prisma.game.findMany({
    where: {
      familyId: family.id,
      requiresScope: true,
      status: 'ACTIVE',
    },
    select: { id: true, code: true },
  });

  for (const game of games) {
    const existingRule = await prisma.gameScopeRule.findUnique({
      where: {
        gameId_scopeId: {
          gameId: game.id,
          scopeId: scope.id,
        },
      },
      select: { id: true },
    });

    if (existingRule) {
      await prisma.gameScopeRule.update({
        where: { id: existingRule.id },
        data: {
          sortOrder: RANDOM_GAME_SCOPE.sortOrder,
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.gameScopeRule.create({
        data: {
          gameId: game.id,
          scopeId: scope.id,
          sortOrder: RANDOM_GAME_SCOPE.sortOrder,
          status: 'ACTIVE',
          config: buildTargetHuntScopeRuleConfig(game.code as TargetHuntGameCode, 'CAREER') as object,
        },
      });
    }

    console.log(`RANDOM scope rule linked: TARGET_HUNT/${game.code}`);
  }

  console.log('RANDOM scope ready. No other catalog records were modified.');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedRandomScope(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
