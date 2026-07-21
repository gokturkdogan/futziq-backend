-- CreateEnum
CREATE TYPE "GameFamilyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "game_families" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "GameFamilyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_families_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_families_code_key" ON "game_families"("code");

-- Seed families
INSERT INTO "game_families" ("id", "code", "title", "description", "sort_order", "status", "created_at", "updated_at")
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'TARGET_HUNT',
    'Hedef Avı',
    'Hedef değere en yakın toplamı oluşturmak için oyuncu seç.',
    1,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'DRAFT',
    'Kadro Kur',
    'Formasyona uygun slotlara oyuncu yerleştirerek kadronu oluştur.',
    2,
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- Add nullable FK column
ALTER TABLE "game_definitions" ADD COLUMN "game_family_id" TEXT;

-- Backfill from legacy family string
UPDATE "game_definitions" AS gd
SET "game_family_id" = gf."id"
FROM "game_families" AS gf
WHERE gf."code" = gd."family";

-- Default any unmatched rows to TARGET_HUNT
UPDATE "game_definitions"
SET "game_family_id" = '00000000-0000-4000-8000-000000000001'
WHERE "game_family_id" IS NULL;

-- Drop legacy column and enforce FK
ALTER TABLE "game_definitions" DROP COLUMN "family";
ALTER TABLE "game_definitions" ALTER COLUMN "game_family_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "game_definitions_game_family_id_idx" ON "game_definitions"("game_family_id");

-- AddForeignKey
ALTER TABLE "game_definitions"
ADD CONSTRAINT "game_definitions_game_family_id_fkey"
FOREIGN KEY ("game_family_id") REFERENCES "game_families"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
