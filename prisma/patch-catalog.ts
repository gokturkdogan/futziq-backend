import { PrismaClient } from '@prisma/client';
import { DRAFT_MATRIX, TARGET_HUNT_MATRIX } from './catalog-matrices';

const prisma = new PrismaClient();

type PatchTarget = 'target-hunt' | 'draft' | 'scopes' | 'random';

function parseOnlyArg(): PatchTarget[] {
  const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
  if (!onlyArg) {
    return ['target-hunt', 'draft', 'scopes', 'random'];
  }
  return onlyArg
    .replace('--only=', '')
    .split(',')
    .map((value) => value.trim() as PatchTarget);
}

async function patchTargetHunt() {
  const family = await prisma.gameFamily.findUnique({
    where: { code: TARGET_HUNT_MATRIX.family },
  });
  if (!family) {
    console.log('Target Hunt family not found, skipping.');
    return;
  }

  for (const gameCode of TARGET_HUNT_MATRIX.games) {
    const game = await prisma.game.findFirst({
      where: { code: gameCode, familyId: family.id },
      include: { scopeRules: { include: { scope: true } } },
    });
    if (!game) continue;

    for (const scopeCode of TARGET_HUNT_MATRIX.scopes) {
      const rule = game.scopeRules.find((entry) => entry.scope.code === scopeCode);
      if (!rule) continue;
      const config = TARGET_HUNT_MATRIX.buildConfig(gameCode, scopeCode);
      await prisma.gameScopeRule.update({
        where: { id: rule.id },
        data: { config: config as object },
      });
      console.log(`Updated ${gameCode}/${scopeCode}`);
    }
  }
}

async function patchDraft() {
  const family = await prisma.gameFamily.findUnique({
    where: { code: DRAFT_MATRIX.family },
  });
  if (!family) {
    console.log('Draft family not found, skipping.');
    return;
  }

  for (const draftGame of DRAFT_MATRIX.games) {
    const game = await prisma.game.findFirst({
      where: { code: draftGame.code, familyId: family.id },
    });
    if (!game) continue;

    const config = DRAFT_MATRIX.buildConfig(draftGame.metric, draftGame.objective);
    await prisma.game.update({
      where: { id: game.id },
      data: { config: config as object },
    });
    console.log(`Updated draft game ${draftGame.code}`);
  }
}

async function main() {
  const targets = parseOnlyArg();
  if (targets.includes('target-hunt') || targets.includes('scopes')) {
    await patchTargetHunt();
  }
  if (targets.includes('draft')) {
    await patchDraft();
  }
  if (targets.includes('random')) {
    console.log('Use npm run db:seed-random-scope for RANDOM scope patching.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
