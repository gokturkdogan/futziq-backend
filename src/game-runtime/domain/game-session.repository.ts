import { GameDefinitionConfig } from '../../game-engine/contracts/game-types';
import { PlayerMode } from './session-runtime';
import { DraftLineupSlotView } from './draft-lineup';
import { LineupTemplate, ObjectiveType } from '../../game-engine/contracts/game-types';

export interface CreateSessionInput {
  familyCode: string;
  gameCode: string;
  scopeCode?: string;
  targetValue?: number;
  playerMode?: PlayerMode;
  externalParticipantId: string;
  sessionExpiryHours: number;
}

export interface GameSessionView {
  id: string;
  status: string;
  stateVersion: number;
  targetValue: number | null;
  seed: string;
  scopeCode: string | null;
  definitionSnapshot: GameDefinitionConfig;
  playerMode: PlayerMode;
  currentTurnParticipantId: string | null;
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
    lineup: DraftLineupSlotView[] | null;
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
  objective?: ObjectiveType | null;
  lineupTemplate?: LineupTemplate | null;
  lineup?: DraftLineupSlotView[] | null;
  totalMetricValue?: number | null;
  averageMetricValue?: number | null;
}

export interface GameSessionRepository {
  createSession(input: CreateSessionInput): Promise<GameSessionView>;
  getSession(sessionId: string, locale?: string): Promise<GameSessionView | null>;
  getSessionForParticipant(
    sessionId: string,
    externalParticipantId: string,
    locale?: string,
  ): Promise<GameSessionView | null>;
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
  getResult(
    sessionId: string,
    externalParticipantId: string,
    locale?: string,
  ): Promise<GameResultView | null>;
  getResults(
    sessionId: string,
    externalParticipantId: string,
    locale?: string,
  ): Promise<GameResultView[]>;
  getPlayerSnapshot(playerId: string): Promise<Record<string, unknown> | null>;
  isPlayerSelectedInSession(sessionId: string, playerId: string): Promise<boolean>;
  buildActionState(
    sessionId: string,
    participantId: string,
    locale?: string,
  ): Promise<import('../../game-engine/contracts/game-family-handler').GameSessionState>;
  getSessionView(sessionId: string, locale?: string): Promise<GameSessionView | null>;
}

export const GAME_SESSION_REPOSITORY = Symbol('GAME_SESSION_REPOSITORY');
