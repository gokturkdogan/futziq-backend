import { GameDefinitionConfig, GameFamily, ObjectiveType } from '../game-engine/contracts/game-types';
import { PlayerMode } from '../game-runtime/domain/session-runtime';
import { DraftLineCode } from '../game-runtime/domain/draft-lineup';
import { GameCapabilities } from './capabilities';

export interface DraftLineupSlotResponse {
  slotCode: string;
  displayName: string;
  line: DraftLineCode;
  occupied: boolean;
  playerId: string | null;
  metricValue: number | null;
  playerSnapshot: Record<string, unknown> | null;
}

export interface GameSelectionResponse {
  id?: string;
  participantId?: string;
  playerId: string;
  selectionOrder: number;
  slotCode: string | null;
  metricValue: number | null;
  metricCode?: string;
  playerSnapshot: Record<string, unknown>;
  revealed: boolean;
}

export interface GameParticipantResponse {
  id: string;
  externalParticipantId: string;
  turnOrder: number;
  status: string;
  aggregateValue: number;
  selectionCount: number;
  lineup: DraftLineupSlotResponse[] | null;
}

export interface GameSessionResponse {
  id: string;
  status: string;
  stateVersion: number;
  targetValue: number | null;
  seed: string;
  scopeCode: string | null;
  family: GameFamily;
  playerMode: PlayerMode;
  currentTurnParticipantId: string | null;
  definitionSnapshot: GameDefinitionConfig;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  participants: GameParticipantResponse[];
  selections: GameSelectionResponse[];
}

export interface ActionStateResponse {
  sessionId: string;
  status: string;
  stateVersion: number;
  targetValue: number | null;
  selectionCount: number;
  aggregateValue: number;
  playerMode: PlayerMode;
  currentTurnParticipantId: string | null;
  lineup: DraftLineupSlotResponse[] | null;
  selections: GameSelectionResponse[];
}

export interface ActionResponse {
  state: ActionStateResponse;
  eventType: string;
  completed: boolean;
  idempotentReplay: boolean;
}

export interface BaseGameResultResponse {
  kind: 'TARGET_HUNT' | 'DRAFT';
  id: string;
  sessionId: string;
  participantId: string;
  selectionCount: number;
  selections: Array<{
    playerId: string;
    selectionOrder: number;
    slotCode: string | null;
    metricValue: number;
    playerSnapshot: Record<string, unknown>;
  }>;
  durationMs: number;
  sessionStatus: string;
  resultStatus: string;
}

export interface TargetHuntResultResponse extends BaseGameResultResponse {
  kind: 'TARGET_HUNT';
  targetValue: number;
  aggregateValue: number;
  absoluteDifference: number;
  exactHit: boolean;
  performanceRating: string;
}

export interface DraftResultResponse extends BaseGameResultResponse {
  kind: 'DRAFT';
  objective: ObjectiveType;
  aggregateValue: number;
  totalMetricValue: number;
  averageMetricValue: number;
  lineup: DraftLineupSlotResponse[];
}

export type GameResultResponse = TargetHuntResultResponse | DraftResultResponse;

export interface EligiblePlayerResponse {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  primaryPosition: string | null;
  subPosition: string | null;
  normalizedPositions: string[];
  isActive: boolean | null;
  alreadySelected: boolean;
}

export interface GameSummaryResponse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  sortOrder: number;
  requiresScope: boolean;
  scopes: Array<{
    id: string;
    code: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
  }> | null;
  capabilities: GameCapabilities;
}

export interface GameFamilyDetailResponse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  sortOrder: number;
  catalogVersion: string;
  games: GameSummaryResponse[];
}
