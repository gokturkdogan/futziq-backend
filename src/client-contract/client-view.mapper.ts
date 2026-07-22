import { RevealPolicy, GameFamily, GameDefinitionConfig, ObjectiveType } from '../game-engine/contracts/game-types';
import { parseGameDefinitionConfig } from '../game-engine/core/config-parser';
import { GameResultView, GameSessionView } from '../game-runtime/domain/game-session.repository';
import { DraftLineupSlotView } from '../game-runtime/domain/draft-lineup';
import { ProcessActionResult } from '../game-engine/contracts/game-family-handler';
import { GameSummaryView } from '../game-catalog/domain/game-catalog.repository';
import { deriveCapabilitiesFromConfig } from './capabilities';
import {
  ActionResponse,
  ActionStateResponse,
  DraftResultResponse,
  EligiblePlayerResponse,
  GameResultResponse,
  GameSelectionResponse,
  GameSessionResponse,
  GameSummaryResponse,
  TargetHuntResultResponse,
} from './types';

function mapLineup(lineup: DraftLineupSlotView[] | null | undefined): DraftLineupSlotView[] | null {
  return lineup ?? null;
}

function mapSelection(input: {
  id?: string;
  participantId?: string;
  playerId: string;
  selectionOrder: number;
  slotCode?: string | null;
  metricCode?: string;
  metricValue?: number | null;
  metricValueSnapshot?: number;
  playerSnapshot: Record<string, unknown>;
  revealed: boolean;
}): GameSelectionResponse {
  return {
    id: input.id,
    participantId: input.participantId,
    playerId: input.playerId,
    selectionOrder: input.selectionOrder,
    slotCode: input.slotCode ?? null,
    metricValue: input.metricValue ?? input.metricValueSnapshot ?? null,
    metricCode: input.metricCode,
    playerSnapshot: input.playerSnapshot,
    revealed: input.revealed,
  };
}

export class ClientViewMapper {
  static toGameSessionResponse(session: GameSessionView): GameSessionResponse {
    const definition = parseGameDefinitionConfig(session.definitionSnapshot);

    return {
      id: session.id,
      status: session.status,
      stateVersion: session.stateVersion,
      targetValue: session.targetValue,
      seed: session.seed,
      scopeCode: session.scopeCode,
      family: definition.family,
      playerMode: session.playerMode,
      currentTurnParticipantId: session.currentTurnParticipantId,
      definitionSnapshot: definition,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      expiresAt: session.expiresAt,
      participants: session.participants.map((participant) => ({
        ...participant,
        lineup: mapLineup(participant.lineup),
      })),
      selections: session.selections.map((selection) => mapSelection(selection)),
    };
  }

  static toActionResponse(result: ProcessActionResult): ActionResponse {
    const state = result.state as ActionStateResponse & {
      selections: Array<{
        playerId: string;
        selectionOrder: number;
        slotCode?: string | null;
        metricValue?: number | null;
        playerSnapshot: Record<string, unknown>;
        revealed: boolean;
      }>;
    };

    return {
      state: {
        sessionId: state.sessionId,
        status: state.status,
        stateVersion: state.stateVersion,
        targetValue: state.targetValue,
        selectionCount: state.selectionCount,
        aggregateValue: state.aggregateValue,
        playerMode: state.playerMode,
        currentTurnParticipantId: state.currentTurnParticipantId ?? null,
        lineup: mapLineup(state.lineup),
        selections: state.selections.map((selection) => mapSelection(selection)),
      },
      eventType: result.eventType,
      completed: result.completed,
      idempotentReplay: result.idempotentReplay,
    };
  }

  static toGameResultResponse(result: GameResultView, family: GameFamily): GameResultResponse {
    const selections = result.selections.map((selection) => ({
      playerId: selection.playerId,
      selectionOrder: selection.selectionOrder,
      slotCode: selection.slotCode ?? null,
      metricValue: selection.metricValue,
      playerSnapshot: selection.playerSnapshot,
    }));

    if (family === GameFamily.DRAFT) {
      const draft: DraftResultResponse = {
        kind: 'DRAFT',
        id: result.id,
        sessionId: result.sessionId,
        participantId: result.participantId,
        selectionCount: result.selectionCount,
        selections,
        durationMs: result.durationMs,
        sessionStatus: result.sessionStatus,
        resultStatus: result.resultStatus,
        objective: result.objective ?? ObjectiveType.MAX,
        aggregateValue: result.aggregateValue,
        totalMetricValue: result.totalMetricValue ?? result.aggregateValue,
        averageMetricValue: result.averageMetricValue ?? 0,
        lineup: mapLineup(result.lineup) ?? [],
      };
      return draft;
    }

    const targetHunt: TargetHuntResultResponse = {
      kind: 'TARGET_HUNT',
      id: result.id,
      sessionId: result.sessionId,
      participantId: result.participantId,
      selectionCount: result.selectionCount,
      selections,
      durationMs: result.durationMs,
      sessionStatus: result.sessionStatus,
      resultStatus: result.resultStatus,
      targetValue: result.targetValue,
      aggregateValue: result.aggregateValue,
      absoluteDifference: result.absoluteDifference,
      exactHit: result.exactHit,
      performanceRating: result.performanceRating,
    };
    return targetHunt;
  }

  static toGameSummaryResponse(game: GameSummaryView, familyCode: string): GameSummaryResponse {
    let config: GameDefinitionConfig;
    try {
      config = game.config
        ? parseGameDefinitionConfig(game.config)
        : ({
            family: familyCode,
            selectionCount: familyCode === 'DRAFT' ? 6 : 5,
          } as GameDefinitionConfig);
    } catch {
      config = {
        family: familyCode as GameFamily,
        selectionCount: familyCode === 'DRAFT' ? 6 : 5,
      } as GameDefinitionConfig;
    }

    const capabilities = deriveCapabilitiesFromConfig(
      familyCode,
      config,
      game.requiresScope,
    );

    return {
      id: game.id,
      code: game.code,
      title: game.title,
      description: game.description,
      imageUrl: game.imageUrl,
      bannerImageUrl: game.bannerImageUrl,
      sortOrder: game.sortOrder,
      requiresScope: game.requiresScope,
      scopes: game.scopes,
      capabilities,
    };
  }

  static toEligiblePlayerResponse(
    player: {
      id: string;
      displayName: string;
      firstName: string | null;
      lastName: string | null;
      primaryPosition: string | null;
      subPosition: string | null;
      normalizedPositions: string[];
      isActive: boolean | null;
      alreadySelected: boolean;
    },
  ): EligiblePlayerResponse {
    return { ...player };
  }

  static shouldRevealMetric(revealPolicy: RevealPolicy): boolean {
    return revealPolicy === RevealPolicy.IMMEDIATE;
  }
}
