import { PrismaClient } from '@prisma/client';
import { SUPPORTED_LOCALES } from '../src/common/locale/locale.constants';
import { GameFamily, ObjectiveType } from '../src/game-engine/contracts/game-types';
import {
  DRAFT_GAME_SCOPES,
  DraftGameScopeCode,
  buildDraftScopeRuleConfig,
  getDefaultLocaleText,
} from './catalog-seed';

const DRAFT_GAME_OBJECTIVES: Record<string, ObjectiveType> = {
  TALLEST_XI: ObjectiveType.MAX,
  SHORTEST_XI: ObjectiveType.MIN,
};

/**
 * Ensures DRAFT_CLUB / DRAFT_COUNTRY scope rows exist.
 * Does not modify other scopes, families, games, or runtime data.
 * Existing draft scope titles/descriptions/images are preserved.
 */
export async function ensureDraftScopes(prisma: PrismaClient) {
  for (const scope of DRAFT_GAME_SCOPES) {
    const existing = await prisma.gameScope.findUnique({
      where: { code: scope.code },
      select: { id: true },
    });

    if (existing) {
      await prisma.gameScope.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      });
      console.log(`Draft scope exists (left unchanged): ${scope.code}`);
      continue;
    }

    const defaultText = getDefaultLocaleText(scope.translations);
    const record = await prisma.gameScope.create({
      data: {
        code: scope.code,
        title: defaultText.title,
        description: defaultText.description,
        imageUrl: scope.imageUrl,
        sortOrder: scope.sortOrder,
        status: 'ACTIVE',
      },
    });

    for (const locale of SUPPORTED_LOCALES) {
      const text = scope.translations[locale];
      await prisma.gameScopeTranslation.create({
        data: {
          scopeId: record.id,
          locale,
          title: text.title,
          description: text.description,
        },
      });
    }

    console.log(`Draft scope created: ${scope.code}`);
  }
}

/**
 * Updates only DRAFT family games and their scope rules.
 * Does not touch Target Hunt, other families, player data, or sessions.
 */
export async function updateDraftGameConfigs(prisma: PrismaClient) {
  await ensureDraftScopes(prisma);

  const family = await prisma.gameFamily.findUnique({
    where: { code: GameFamily.DRAFT },
    select: { id: true },
  });

  if (!family) {
    throw new Error('DRAFT family not found. Run migrations first.');
  }

  const games = await prisma.game.findMany({
    where: { familyId: family.id, status: 'ACTIVE' },
    select: { id: true, code: true },
  });

  if (games.length === 0) {
    throw new Error('No active DRAFT games found.');
  }

  for (const game of games) {
    const objective = DRAFT_GAME_OBJECTIVES[game.code] ?? ObjectiveType.MAX;

    await prisma.game.update({
      where: { id: game.id },
      data: { requiresScope: true, config: null },
    });

    for (const scope of DRAFT_GAME_SCOPES) {
      const scopeRecord = await prisma.gameScope.findUnique({ where: { code: scope.code } });
      if (!scopeRecord) {
        throw new Error(`Draft scope missing after ensure step: ${scope.code}`);
      }

      const ruleConfig = buildDraftScopeRuleConfig(scope.code as DraftGameScopeCode, objective);
      await prisma.gameScopeRule.upsert({
        where: {
          gameId_scopeId: {
            gameId: game.id,
            scopeId: scopeRecord.id,
          },
        },
        update: {
          sortOrder: scope.sortOrder,
          status: 'ACTIVE',
          config: ruleConfig as object,
        },
        create: {
          gameId: game.id,
          scopeId: scopeRecord.id,
          sortOrder: scope.sortOrder,
          status: 'ACTIVE',
          config: ruleConfig as object,
        },
      });
    }

    console.log(`Draft config updated: DRAFT/${game.code}`);
  }

  console.log('Draft-only catalog patch complete.');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await updateDraftGameConfigs(prisma);
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
