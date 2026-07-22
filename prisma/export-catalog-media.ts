import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { CatalogMediaFile } from './catalog-media';
import { gameMediaKey } from './catalog-media';

const prisma = new PrismaClient();
const outputPath = join(__dirname, 'catalog-media.snapshot.json');

async function main() {
  const families = await prisma.gameFamily.findMany({
    select: { code: true, imageUrl: true, logoUrl: true },
    orderBy: { sortOrder: 'asc' },
  });

  const games = await prisma.game.findMany({
    select: {
      code: true,
      imageUrl: true,
      bannerImageUrl: true,
      family: { select: { code: true } },
    },
    orderBy: [{ family: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
  });

  const scopes = await prisma.gameScope.findMany({
    select: { code: true, imageUrl: true },
    orderBy: { sortOrder: 'asc' },
  });

  const payload: CatalogMediaFile = {
    families: Object.fromEntries(
      families.map((family) => [
        family.code,
        {
          imageUrl: family.imageUrl,
          logoUrl: family.logoUrl,
        },
      ]),
    ),
    games: Object.fromEntries(
      games.map((game) => [
        gameMediaKey(game.family.code, game.code),
        {
          imageUrl: game.imageUrl,
          bannerImageUrl: game.bannerImageUrl,
        },
      ]),
    ),
    scopes: Object.fromEntries(
      scopes.map((scope) => [
        scope.code,
        {
          imageUrl: scope.imageUrl,
        },
      ]),
    ),
  };

  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const remoteCount =
    families.filter((f) => f.imageUrl?.startsWith('http') || f.logoUrl?.startsWith('http')).length +
    games.filter((g) => g.imageUrl?.startsWith('http') || g.bannerImageUrl?.startsWith('http')).length +
    scopes.filter((s) => s.imageUrl?.startsWith('http')).length;

  console.log(`Exported catalog media to ${outputPath}`);
  console.log(`Families: ${families.length}, Games: ${games.length}, Scopes: ${scopes.length}`);
  console.log(`Entries with remote URLs: ${remoteCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
