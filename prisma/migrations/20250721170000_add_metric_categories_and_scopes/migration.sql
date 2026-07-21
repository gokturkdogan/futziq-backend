-- CreateTable
CREATE TABLE "game_metric_categories" (
    "id" TEXT NOT NULL,
    "game_family_id" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "GameFamilyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_metric_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_scope_options" (
    "id" TEXT NOT NULL,
    "game_metric_category_id" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "GameFamilyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_scope_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_metric_categories_game_family_id_code_key" ON "game_metric_categories"("game_family_id", "code");

-- CreateIndex
CREATE INDEX "game_metric_categories_game_family_id_idx" ON "game_metric_categories"("game_family_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_scope_options_game_metric_category_id_code_key" ON "game_scope_options"("game_metric_category_id", "code");

-- CreateIndex
CREATE INDEX "game_scope_options_game_metric_category_id_idx" ON "game_scope_options"("game_metric_category_id");

-- AlterTable
ALTER TABLE "game_definitions" ADD COLUMN "game_metric_category_id" TEXT;
ALTER TABLE "game_definitions" ADD COLUMN "game_scope_option_id" TEXT;

-- CreateIndex
CREATE INDEX "game_definitions_game_metric_category_id_idx" ON "game_definitions"("game_metric_category_id");
CREATE INDEX "game_definitions_game_scope_option_id_idx" ON "game_definitions"("game_scope_option_id");

-- AddForeignKey
ALTER TABLE "game_metric_categories" ADD CONSTRAINT "game_metric_categories_game_family_id_fkey" FOREIGN KEY ("game_family_id") REFERENCES "game_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scope_options" ADD CONSTRAINT "game_scope_options_game_metric_category_id_fkey" FOREIGN KEY ("game_metric_category_id") REFERENCES "game_metric_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_definitions" ADD CONSTRAINT "game_definitions_game_metric_category_id_fkey" FOREIGN KEY ("game_metric_category_id") REFERENCES "game_metric_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_definitions" ADD CONSTRAINT "game_definitions_game_scope_option_id_fkey" FOREIGN KEY ("game_scope_option_id") REFERENCES "game_scope_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
