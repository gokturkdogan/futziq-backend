import { GameDefinitionConfig } from './game-types';

export interface MetricValue {
  code: string;
  numericValue: number;
}

export interface MetricContext {
  sessionId: string;
  definition: GameDefinitionConfig;
}

export interface MetricEligibilityFilter {
  metricNotNull: boolean;
  metricColumn?: string;
  metricMinValue?: number;
  activeStatusFilter?: string;
}

export interface MetricResolver {
  readonly code: string;
  resolveForPlayer(playerId: string, context: MetricContext): Promise<MetricValue | null>;
  buildEligibilityFilter(context: MetricContext): Promise<MetricEligibilityFilter>;
}
