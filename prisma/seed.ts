import { PrismaClient } from '@prisma/client';
import { GameFamily } from '../src/game-engine/contracts/game-types';
import {
  DRAFT_GAMES,
  GAME_FAMILIES,
  GAME_SCOPES,
  TARGET_HUNT_GAMES,
  TargetHuntGameCode,
  GameScopeCode,
  buildDraftGameConfig,
  buildTargetHuntScopeRuleConfig,
} from './catalog-seed';

const prisma = new PrismaClient();

async function upsertFamilies() {
  for (const family of GAME_FAMILIES) {
    await prisma.gameFamily.upsert({
      where: { code: family.code },
      update: {
        title: family.title,
        description: family.description,
        imageUrl: family.imageUrl,
        sortOrder: family.sortOrder,
        status: 'ACTIVE',
      },
      create: {
        code: family.code,
        title: family.title,
        description: family.description,
        imageUrl: family.imageUrl,
        sortOrder: family.sortOrder,
        status: 'ACTIVE',
      },
    });
    console.log(`Family ready: ${family.code}`);
  }
}

async function upsertScopes() {
  for (const scope of GAME_SCOPES) {
    await prisma.gameScope.upsert({
      where: { code: scope.code },
      update: {
        title: scope.title,
        description: scope.description,
        sortOrder: scope.sortOrder,
        status: 'ACTIVE',
      },
      create: {
        code: scope.code,
        title: scope.title,
        description: scope.description,
        sortOrder: scope.sortOrder,
        status: 'ACTIVE',
      },
    });
    console.log(`Scope ready: ${scope.code}`);
  }
}

async function seedTargetHuntGames() {
  const family = await prisma.gameFamily.findUnique({ where: { code: GameFamily.TARGET_HUNT } });
  if (!family) throw new Error('TARGET_HUNT family missing');

  const scopes = await prisma.gameScope.findMany({ where: { status: 'ACTIVE' } });
  const scopeByCode = new Map(scopes.map((scope) => [scope.code, scope]));

  for (const game of TARGET_HUNT_GAMES) {
    const gameRecord = await prisma.game.upsert({
      where: {
        familyId_code: {
          familyId: family.id,
          code: game.code,
        },
      },
      update: {
        title: game.title,
        description: `${game.title} hedef avı modu.`,
        imageUrl: game.imageUrl,
        bannerImageUrl: game.bannerImageUrl,
        sortOrder: game.sortOrder,
        status: 'ACTIVE',
        requiresScope: true,
        config: null,
      },
      create: {
        familyId: family.id,
        code: game.code,
        title: game.title,
        description: `${game.title} hedef avı modu.`,
        imageUrl: game.imageUrl,
        bannerImageUrl: game.bannerImageUrl,
        sortOrder: game.sortOrder,
        status: 'ACTIVE',
        requiresScope: true,
      },
    });

    for (const scope of GAME_SCOPES) {
      const scopeRecord = scopeByCode.get(scope.code);
      if (!scopeRecord) continue;

      const gameCode = game.code as TargetHuntGameCode;
      const scopeCode = scope.code as GameScopeCode;

      await prisma.gameScopeRule.upsert({
        where: {
          gameId_scopeId: {
            gameId: gameRecord.id,
            scopeId: scopeRecord.id,
          },
        },
        update: {
          sortOrder: scope.sortOrder,
          status: 'ACTIVE',
          config: buildTargetHuntScopeRuleConfig(gameCode, scopeCode) as object,
        },
        create: {
          gameId: gameRecord.id,
          scopeId: scopeRecord.id,
          sortOrder: scope.sortOrder,
          status: 'ACTIVE',
          config: buildTargetHuntScopeRuleConfig(gameCode, scopeCode) as object,
        },
      });
    }

    console.log(`Game ready: TARGET_HUNT/${game.code}`);
  }
}

async function seedDraftGames() {
  const family = await prisma.gameFamily.findUnique({ where: { code: GameFamily.DRAFT } });
  if (!family) throw new Error('DRAFT family missing');

  for (const game of DRAFT_GAMES) {
    await prisma.game.upsert({
      where: {
        familyId_code: {
          familyId: family.id,
          code: game.code,
        },
      },
      update: {
        title: game.title,
        description: game.description,
        imageUrl: game.imageUrl,
        bannerImageUrl: game.bannerImageUrl,
        sortOrder: game.code === 'TALLEST_XI' ? 1 : 2,
        status: 'ACTIVE',
        requiresScope: false,
        config: buildDraftGameConfig(game.objective) as object,
      },
      create: {
        familyId: family.id,
        code: game.code,
        title: game.title,
        description: game.description,
        imageUrl: game.imageUrl,
        bannerImageUrl: game.bannerImageUrl,
        sortOrder: game.code === 'TALLEST_XI' ? 1 : 2,
        status: 'ACTIVE',
        requiresScope: false,
        config: buildDraftGameConfig(game.objective) as object,
      },
    });
    console.log(`Game ready: DRAFT/${game.code}`);
  }
}

async function main() {
  await upsertFamilies();
  await upsertScopes();
  await seedTargetHuntGames();
  await seedDraftGames();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
