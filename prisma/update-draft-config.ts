import { PrismaClient } from '@prisma/client';
import { GameFamily, ObjectiveType } from '../src/game-engine/contracts/game-types';
import { buildDraftGameConfig } from './catalog-seed';

const DRAFT_GAME_OBJECTIVES: Record<string, ObjectiveType> = {
  TALLEST_XI: ObjectiveType.MAX,
  SHORTEST_XI: ObjectiveType.MIN,
};

/**
 * Updates only DRAFT game `config` JSON to the current 6-player lineup definition.
 * Does not modify images, titles, translations, or any other catalog records.
 */
export async function updateDraftGameConfigs(prisma: PrismaClient) {
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
    const config = buildDraftGameConfig(objective);

    await prisma.game.update({
      where: { id: game.id },
      data: { config: config as object },
    });

    console.log(`Draft config updated: DRAFT/${game.code}`);
  }

  console.log('Draft game configs updated. No other catalog records were modified.');
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
