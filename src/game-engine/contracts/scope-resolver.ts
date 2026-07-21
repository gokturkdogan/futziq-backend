import { GameDefinitionConfig, ScopeCode } from './game-types';
import { PaginatedResult } from '../../common/pagination/pagination';

export interface ScopeDefinition {
  code: ScopeCode;
  params?: Record<string, unknown>;
}

export interface PlayerSearchQuery {
  query: string;
  page: number;
  limit: number;
  excludePlayerIds?: string[];
  slotCode?: string;
}

export interface EligiblePlayerSummary {
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

export interface ScopeContext {
  sessionId: string;
  definition: GameDefinitionConfig;
  scopeParams?: Record<string, unknown>;
}

export interface ScopeResolver {
  readonly code: string;
  searchEligiblePlayers(
    definition: ScopeDefinition,
    query: PlayerSearchQuery,
    context: ScopeContext,
  ): Promise<PaginatedResult<EligiblePlayerSummary>>;
  isPlayerEligible(
    playerId: string,
    definition: ScopeDefinition,
    context: ScopeContext,
  ): Promise<boolean>;
}
