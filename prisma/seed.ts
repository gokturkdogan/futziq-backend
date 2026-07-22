import { PrismaClient } from '@prisma/client';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../src/common/locale/locale.constants';
import { GameFamily } from '../src/game-engine/contracts/game-types';
import {
  gameMediaKey,
  loadCatalogMediaFile,
  resolveMediaUrl,
  type CatalogMediaFile,
} from './catalog-media';
import {
  DRAFT_GAMES,
  GAME_FAMILIES,
  GAME_SCOPES,
  TARGET_HUNT_GAMES,
  TargetHuntGameCode,
  PlayableGameScopeCode,
  buildDraftGameConfig,
  buildTargetHuntScopeRuleConfig,
  getDefaultLocaleText,
} from './catalog-seed';
import { isRandomScopeCode } from '../src/game-catalog/domain/catalog.constants';

const prisma = new PrismaClient();

async function upsertTranslations(
  table: 'family' | 'game' | 'scope',
  entityId: string,
  translations: Record<SupportedLocale, { title: string; description: string }>,
) {
  for (const locale of SUPPORTED_LOCALES) {
    const text = translations[locale];
    const data = {
      title: text.title,
      description: text.description,
    };

    if (table === 'family') {
      await prisma.gameFamilyTranslation.upsert({
        where: { familyId_locale: { familyId: entityId, locale } },
        update: data,
        create: { familyId: entityId, locale, ...data },
      });
    } else if (table === 'game') {
      await prisma.gameTranslation.upsert({
        where: { gameId_locale: { gameId: entityId, locale } },
        update: data,
        create: { gameId: entityId, locale, ...data },
      });
    } else {
      await prisma.gameScopeTranslation.upsert({
        where: { scopeId_locale: { scopeId: entityId, locale } },
        update: data,
        create: { scopeId: entityId, locale, ...data },
      });
    }
  }
}

async function upsertFamilies(media: CatalogMediaFile) {
  for (const family of GAME_FAMILIES) {
    const defaultText = getDefaultLocaleText(family.translations);
    const existing = await prisma.gameFamily.findUnique({
      where: { code: family.code },
      select: { id: true, imageUrl: true, logoUrl: true },
    });
    const exported = media.families[family.code];

    const imageUrl = resolveMediaUrl(family.imageUrl, exported?.imageUrl, existing?.imageUrl);
    const logoUrl = resolveMediaUrl(null, exported?.logoUrl, existing?.logoUrl);

    const record = await prisma.gameFamily.upsert({
      where: { code: family.code },
      update: {
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        logoUrl,
        sortOrder: family.sortOrder,
        status: 'ACTIVE',
      },
      create: {
        code: family.code,
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        logoUrl,
        sortOrder: family.sortOrder,
        status: 'ACTIVE',
      },
    });

    await upsertTranslations('family', record.id, family.translations);
    console.log(`Family ready: ${family.code}`);
  }
}

async function upsertScopes(media: CatalogMediaFile) {
  for (const scope of GAME_SCOPES) {
    if (isRandomScopeCode(scope.code)) {
      continue;
    }
    const defaultText = getDefaultLocaleText(scope.translations);
    const existing = await prisma.gameScope.findUnique({
      where: { code: scope.code },
      select: { id: true, imageUrl: true },
    });
    const exported = media.scopes[scope.code];
    const imageUrl = resolveMediaUrl(null, exported?.imageUrl, existing?.imageUrl);

    const record = await prisma.gameScope.upsert({
      where: { code: scope.code },
      update: {
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        sortOrder: scope.sortOrder,
        status: 'ACTIVE',
      },
      create: {
        code: scope.code,
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        sortOrder: scope.sortOrder,
        status: 'ACTIVE',
      },
    });

    await upsertTranslations('scope', record.id, scope.translations);
    console.log(`Scope ready: ${scope.code}`);
  }
}

async function seedTargetHuntGames(media: CatalogMediaFile) {
  const family = await prisma.gameFamily.findUnique({ where: { code: GameFamily.TARGET_HUNT } });
  if (!family) throw new Error('TARGET_HUNT family missing');

  const scopes = await prisma.gameScope.findMany({
    where: { status: 'ACTIVE' },
    include: { translations: true },
  });
  const scopeByCode = new Map(scopes.map((scope) => [scope.code, scope]));

  for (const game of TARGET_HUNT_GAMES) {
    const defaultText = getDefaultLocaleText(game.translations);
    const mediaKey = gameMediaKey(GameFamily.TARGET_HUNT, game.code);
    const existing = await prisma.game.findUnique({
      where: {
        familyId_code: {
          familyId: family.id,
          code: game.code,
        },
      },
      select: { id: true, imageUrl: true, bannerImageUrl: true },
    });
    const exported = media.games[mediaKey];

    const imageUrl = resolveMediaUrl(game.imageUrl, exported?.imageUrl, existing?.imageUrl);
    const bannerImageUrl = resolveMediaUrl(
      game.bannerImageUrl,
      exported?.bannerImageUrl,
      existing?.bannerImageUrl,
    );

    const gameRecord = await prisma.game.upsert({
      where: {
        familyId_code: {
          familyId: family.id,
          code: game.code,
        },
      },
      update: {
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        bannerImageUrl,
        sortOrder: game.sortOrder,
        status: 'ACTIVE',
        requiresScope: true,
        config: null,
      },
      create: {
        familyId: family.id,
        code: game.code,
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        bannerImageUrl,
        sortOrder: game.sortOrder,
        status: 'ACTIVE',
        requiresScope: true,
      },
    });

    await upsertTranslations('game', gameRecord.id, game.translations);

    for (const scope of GAME_SCOPES) {
      if (isRandomScopeCode(scope.code)) {
        continue;
      }

      const scopeRecord = scopeByCode.get(scope.code);
      if (!scopeRecord) continue;

      const gameCode = game.code as TargetHuntGameCode;
      const ruleConfig = buildTargetHuntScopeRuleConfig(gameCode, scope.code as PlayableGameScopeCode);

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
          config: ruleConfig as object,
        },
        create: {
          gameId: gameRecord.id,
          scopeId: scopeRecord.id,
          sortOrder: scope.sortOrder,
          status: 'ACTIVE',
          config: ruleConfig as object,
        },
      });
    }

    console.log(`Game ready: TARGET_HUNT/${game.code}`);
  }
}

async function seedDraftGames(media: CatalogMediaFile) {
  const family = await prisma.gameFamily.findUnique({ where: { code: GameFamily.DRAFT } });
  if (!family) throw new Error('DRAFT family missing');

  for (const game of DRAFT_GAMES) {
    const defaultText = getDefaultLocaleText(game.translations);
    const mediaKey = gameMediaKey(GameFamily.DRAFT, game.code);
    const existing = await prisma.game.findUnique({
      where: {
        familyId_code: {
          familyId: family.id,
          code: game.code,
        },
      },
      select: { id: true, imageUrl: true, bannerImageUrl: true },
    });
    const exported = media.games[mediaKey];

    const imageUrl = resolveMediaUrl(game.imageUrl, exported?.imageUrl, existing?.imageUrl);
    const bannerImageUrl = resolveMediaUrl(
      game.bannerImageUrl,
      exported?.bannerImageUrl,
      existing?.bannerImageUrl,
    );

    const record = await prisma.game.upsert({
      where: {
        familyId_code: {
          familyId: family.id,
          code: game.code,
        },
      },
      update: {
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        bannerImageUrl,
        sortOrder: game.code === 'TALLEST_XI' ? 1 : 2,
        status: 'ACTIVE',
        requiresScope: false,
        config: buildDraftGameConfig(game.objective) as object,
      },
      create: {
        familyId: family.id,
        code: game.code,
        title: defaultText.title,
        description: defaultText.description,
        imageUrl,
        bannerImageUrl,
        sortOrder: game.code === 'TALLEST_XI' ? 1 : 2,
        status: 'ACTIVE',
        requiresScope: false,
        config: buildDraftGameConfig(game.objective) as object,
      },
    });

    await upsertTranslations('game', record.id, game.translations);
    console.log(`Game ready: DRAFT/${game.code}`);
  }
}

async function main() {
  const media = loadCatalogMediaFile();
  await upsertFamilies(media);
  await upsertScopes(media);
  await seedTargetHuntGames(media);
  await seedDraftGames(media);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
