-- CreateEnum
CREATE TYPE "GameDefinitionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GameParticipantStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "PerformanceRating" AS ENUM ('PERFECT', 'EXCELLENT', 'GOOD', 'AVERAGE', 'POOR');

-- CreateTable
CREATE TABLE "game_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GameDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_definition_versions" (
    "id" TEXT NOT NULL,
    "game_definition_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_definition_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_sessions" (
    "id" TEXT NOT NULL,
    "game_definition_version_id" TEXT NOT NULL,
    "definition_snapshot" JSONB NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'CREATED',
    "seed" TEXT NOT NULL,
    "target_value" INTEGER,
    "state_version" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_participants" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "external_participant_id" TEXT NOT NULL,
    "turn_order" INTEGER NOT NULL,
    "status" "GameParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "aggregate_value" INTEGER NOT NULL DEFAULT 0,
    "selection_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_actions" (
    "id" TEXT NOT NULL,
    "action_id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "expected_version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "result_version" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_events" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "participant_id" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_selections" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "selection_order" INTEGER NOT NULL,
    "metric_code" TEXT NOT NULL,
    "metric_value_snapshot" INTEGER NOT NULL,
    "player_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_results" (
    "id" TEXT NOT NULL,
    "game_session_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "target_value" INTEGER NOT NULL,
    "aggregate_value" INTEGER NOT NULL,
    "absolute_difference" INTEGER NOT NULL,
    "exact_hit" BOOLEAN NOT NULL,
    "performance_rating" "PerformanceRating" NOT NULL,
    "result_payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_definitions_code_key" ON "game_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "game_definition_versions_game_definition_id_version_key" ON "game_definition_versions"("game_definition_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_game_session_id_external_participant_id_key" ON "game_participants"("game_session_id", "external_participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_actions_game_session_id_action_id_key" ON "game_actions"("game_session_id", "action_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_events_game_session_id_sequence_key" ON "game_events"("game_session_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "game_selections_game_session_id_participant_id_player_id_key" ON "game_selections"("game_session_id", "participant_id", "player_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_selections_game_session_id_participant_id_selection_ord_key" ON "game_selections"("game_session_id", "participant_id", "selection_order");

-- CreateIndex
CREATE UNIQUE INDEX "game_results_game_session_id_participant_id_key" ON "game_results"("game_session_id", "participant_id");

-- AddForeignKey
ALTER TABLE "game_definition_versions" ADD CONSTRAINT "game_definition_versions_game_definition_id_fkey" FOREIGN KEY ("game_definition_id") REFERENCES "game_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_definition_version_id_fkey" FOREIGN KEY ("game_definition_version_id") REFERENCES "game_definition_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_actions" ADD CONSTRAINT "game_actions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "game_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "game_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_selections" ADD CONSTRAINT "game_selections_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_selections" ADD CONSTRAINT "game_selections_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "game_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_game_session_id_fkey" FOREIGN KEY ("game_session_id") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "game_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Optional: index for eligible player search (non-destructive, on existing table)
CREATE INDEX IF NOT EXISTS "players_total_goals_idx" ON "players"("total_goals") WHERE "total_goals" IS NOT NULL;
