-- CreateTable
CREATE TABLE "game_family_translations" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_family_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_translations" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_scope_translations" (
    "id" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_scope_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_family_translations_locale_idx" ON "game_family_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "game_family_translations_family_id_locale_key" ON "game_family_translations"("family_id", "locale");

-- CreateIndex
CREATE INDEX "game_translations_locale_idx" ON "game_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "game_translations_game_id_locale_key" ON "game_translations"("game_id", "locale");

-- CreateIndex
CREATE INDEX "game_scope_translations_locale_idx" ON "game_scope_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "game_scope_translations_scope_id_locale_key" ON "game_scope_translations"("scope_id", "locale");

-- AddForeignKey
ALTER TABLE "game_family_translations" ADD CONSTRAINT "game_family_translations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "game_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_translations" ADD CONSTRAINT "game_translations_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scope_translations" ADD CONSTRAINT "game_scope_translations_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "game_scopes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing Turkish content into translation tables
INSERT INTO "game_family_translations" ("id", "family_id", "locale", "title", "description", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", 'tr', "title", "description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "game_families";

INSERT INTO "game_translations" ("id", "game_id", "locale", "title", "description", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", 'tr', "title", "description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "games";

INSERT INTO "game_scope_translations" ("id", "scope_id", "locale", "title", "description", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", 'tr', "title", "description", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "game_scopes";
