import { GameDefinitionConfig } from '../../game-engine/contracts/game-types';
import {
  ProcessActionInput,
  ProcessActionResult,
} from '../../game-engine/contracts/game-family-handler';

export interface CreateSessionInput {
  familyCode: string;
  gameCode: string;
  scopeCode?: string;
  targetValue?: number;
  externalParticipantId: string;
  sessionExpiryHours: number;
}

export interface GameSessionView {
  id: string;
  status: string;
  stateVersion: number;
  targetValue: number | null;
  seed: string;
  definitionSnapshot: GameDefinitionConfig;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  participants: Array<{
    id: string;
    externalParticipantId: string;
    turnOrder: number;
    status: string;
    aggregateValue: number;
    selectionCount: number;
  }>;
  selections: Array<{
    id: string;
    participantId: string;
    playerId: string;
    selectionOrder: number;
    slotCode?: string | null;
    metricCode: string;
    metricValueSnapshot: number;
    playerSnapshot: Record<string, unknown>;
    revealed: boolean;
  }>;
}

export interface GameResultView {
  id: string;
  sessionId: string;
  participantId: string;
  targetValue: number;
  aggregateValue: number;
  absoluteDifference: number;
  exactHit: boolean;
  performanceRating: string;
  selectionCount: number;
  selections: Array<{
    playerId: string;
    selectionOrder: number;
    slotCode?: string | null;
    metricValue: number;
    playerSnapshot: Record<string, unknown>;
  }>;
  durationMs: number;
  sessionStatus: string;
  resultStatus: string;
}

export interface GameSessionRepository {
  createSession(input: CreateSessionInput): Promise<GameSessionView>;
  getSession(sessionId: string): Promise<GameSessionView | null>;
  getSessionForParticipant(
    sessionId: string,
    externalParticipantId: string,
  ): Promise<GameSessionView | null>;
  processSelectPlayerAction(
    input: ProcessActionInput,
    hooks: {
      validateAndResolve: (ctx: {
        sessionId: string;
        participantId: string;
        playerId: string;
        slotCode?: string;
        definition: GameDefinitionConfig;
        selectedPlayerIds: string[];
        existingSelections: Array<{
          playerId: string;
          selectionOrder: number;
          slotCode?: string | null;
          metricValue: number;
          playerSnapshot: Record<string, unknown>;
        }>;
      }) => Promise<{ metricValue: number; playerSnapshot: Record<string, unknown> }>;
      onComplete: (ctx: {
        targetValue: number;
        aggregateValue: number;
        definition: GameDefinitionConfig;
        selections: Array<{
          playerId: string;
          selectionOrder: number;
          slotCode?: string | null;
          metricValue: number;
          playerSnapshot: Record<string, unknown>;
        }>;
        startedAt: Date | null;
        completedAt: Date;
      }) => Promise<{
        targetValue: number;
        aggregateValue: number;
        absoluteDifference: number;
        exactHit: boolean;
        performanceRating: string;
        resultPayload: Record<string, unknown>;
      }>;
      shouldReveal: (definition: GameDefinitionConfig, phase: 'selection' | 'complete') => boolean;
    },
  ): Promise<ProcessActionResult>;
  getEvents(sessionId: string): Promise<
    Array<{
      id: string;
      sequence: number;
      eventType: string;
      participantId: string | null;
      payload: Record<string, unknown>;
      createdAt: string;
    }>
  >;
  getResult(sessionId: string, externalParticipantId: string): Promise<GameResultView | null>;
  getPlayerSnapshot(playerId: string): Promise<Record<string, unknown> | null>;
  isPlayerSelectedInSession(sessionId: string, playerId: string): Promise<boolean>;
}

export const GAME_SESSION_REPOSITORY = Symbol('GAME_SESSION_REPOSITORY');
