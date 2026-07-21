import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  MetricContext,
  MetricEligibilityFilter,
  MetricResolver,
  MetricValue,
} from '../contracts/metric-resolver';
import {
  FOOTBALL_DATA_REPOSITORY,
  FootballDataRepository,
} from '../../football-data/domain/football-data.repository';
import { ActiveStatusFilter, MetricCode } from '../contracts/game-types';
import { MetricRegistry } from '../registries/metric.registry';
import { METRIC_FIELD_MAP, resolveMetricField } from './metric-field-map';

function createFieldMetricResolver(
  code: string,
  footballData: FootballDataRepository,
): MetricResolver {
  const field = resolveMetricField(code);

  return {
    code,
    async resolveForPlayer(playerId: string): Promise<MetricValue | null> {
      const player = await footballData.findById(playerId);
      if (!player) return null;

      const value = player[field.recordField] as number | null;
      const minValue = field.minValue ?? 0;
      if (value == null || value < minValue) return null;
      if (code === MetricCode.HEIGHT_CM && value > 230) return null;

      return { code, numericValue: value };
    },
    async buildEligibilityFilter(context: MetricContext): Promise<MetricEligibilityFilter> {
      return {
        metricNotNull: true,
        metricMinValue: field.minValue ?? 0,
        metricColumn: field.prismaField,
        activeStatusFilter: context.definition.activeStatusFilter ?? ActiveStatusFilter.ANY,
      };
    },
  };
}

@Injectable()
export class MetricRegistrationService implements OnModuleInit {
  constructor(
    private readonly metricRegistry: MetricRegistry,
    @Inject(FOOTBALL_DATA_REPOSITORY)
    private readonly footballData: FootballDataRepository,
  ) {}

  onModuleInit(): void {
    for (const code of Object.keys(METRIC_FIELD_MAP)) {
      this.metricRegistry.register(createFieldMetricResolver(code, this.footballData));
    }
  }
}

// Backward-compatible named exports used by tests/imports.
export const CareerGoalsMetricResolver = MetricRegistrationService;
export const CareerYellowCardsMetricResolver = MetricRegistrationService;
export const CareerRedCardsMetricResolver = MetricRegistrationService;
export const CareerAppearancesMetricResolver = MetricRegistrationService;
export const NationalTeamGoalsMetricResolver = MetricRegistrationService;
export const NationalTeamAppearancesMetricResolver = MetricRegistrationService;
export const HeightCmMetricResolver = MetricRegistrationService;
