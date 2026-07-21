-- Reset runtime data tied to old catalog model
TRUNCATE TABLE "game_results", "game_selections", "game_events", "game_actions", "game_participants", "game_sessions" CASCADE;

ALTER TABLE "game_sessions" DROP CONSTRAINT IF EXISTS "game_sessions_game_definition_version_id_fkey";
ALTER TABLE "game_sessions" DROP COLUMN IF EXISTS "game_definition_version_id";

DROP TABLE IF EXISTS "game_definition_versions";
DROP TABLE IF EXISTS "game_definitions";
DROP TABLE IF EXISTS "game_scope_options";
DROP TABLE IF EXISTS "game_metric_categories";

DROP TYPE IF EXISTS "GameDefinitionStatus";

CREATE TYPE "CatalogStatus" AS ENUM ('ACTIVE', 'INACTIVE');

ALTER TABLE "game_families" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "game_families" ALTER COLUMN "status" TYPE "CatalogStatus" USING ("status"::text::"CatalogStatus");
ALTER TABLE "game_families" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "requires_scope" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_scopes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_scopes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "game_scope_rules" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_scope_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "games_family_id_code_key" ON "games"("family_id", "code");
CREATE INDEX "games_family_id_idx" ON "games"("family_id");
CREATE UNIQUE INDEX "game_scopes_code_key" ON "game_scopes"("code");
CREATE UNIQUE INDEX "game_scope_rules_game_id_scope_id_key" ON "game_scope_rules"("game_id", "scope_id");
CREATE INDEX "game_scope_rules_game_id_idx" ON "game_scope_rules"("game_id");
CREATE INDEX "game_scope_rules_scope_id_idx" ON "game_scope_rules"("scope_id");

ALTER TABLE "games" ADD CONSTRAINT "games_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "game_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_scope_rules" ADD CONSTRAINT "game_scope_rules_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_scope_rules" ADD CONSTRAINT "game_scope_rules_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "game_scopes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "game_sessions" ADD COLUMN "game_id" TEXT;
ALTER TABLE "game_sessions" ADD COLUMN "scope_id" TEXT;
ALTER TABLE "game_sessions" ADD COLUMN "game_scope_rule_id" TEXT;

CREATE INDEX "game_sessions_game_id_idx" ON "game_sessions"("game_id");
CREATE INDEX "game_sessions_scope_id_idx" ON "game_sessions"("scope_id");

ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "game_scopes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_scope_rule_id_fkey" FOREIGN KEY ("game_scope_rule_id") REFERENCES "game_scope_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TYPE IF EXISTS "GameFamilyStatus";
