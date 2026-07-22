export type DraftRoundScopeType = 'CLUB' | 'COUNTRY';

export interface DraftScopeEntityView {
  type: DraftRoundScopeType;
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface DraftRoundRuntime {
  scopeType: DraftRoundScopeType;
  currentRound: number;
  totalRounds: number;
  picksInCurrentRound: number;
  picksPerRound: number;
  currentEntity: DraftScopeEntityView;
  usedEntityIds: string[];
}

export interface DraftRoundContextResponse {
  roundNumber: number;
  totalRounds: number;
  scopeType: DraftRoundScopeType;
  picksInRound: number;
  picksRequired: number;
  entity: DraftScopeEntityView;
}

export function toDraftRoundContextResponse(
  draftRound: DraftRoundRuntime,
): DraftRoundContextResponse {
  return {
    roundNumber: draftRound.currentRound,
    totalRounds: draftRound.totalRounds,
    scopeType: draftRound.scopeType,
    picksInRound: draftRound.picksInCurrentRound,
    picksRequired: draftRound.picksPerRound,
    entity: draftRound.currentEntity,
  };
}

export function getDraftRoundScopeParams(
  draftRound: DraftRoundRuntime | undefined,
): Record<string, unknown> | undefined {
  if (!draftRound) {
    return undefined;
  }
  if (draftRound.scopeType === 'CLUB') {
    return { clubId: draftRound.currentEntity.id };
  }
  return { countryId: draftRound.currentEntity.id };
}

export function mergeScopeParams(
  definitionParams: Record<string, unknown> | undefined,
  draftRound: DraftRoundRuntime | undefined,
): Record<string, unknown> | undefined {
  const roundParams = getDraftRoundScopeParams(draftRound);
  if (!definitionParams && !roundParams) {
    return undefined;
  }
  return { ...definitionParams, ...roundParams };
}

export function hasRoundScope(config: { roundScopeType?: DraftRoundScopeType }): boolean {
  return config.roundScopeType === 'CLUB' || config.roundScopeType === 'COUNTRY';
}

export function recordPickInRound(draftRound: DraftRoundRuntime): DraftRoundRuntime {
  return {
    ...draftRound,
    picksInCurrentRound: draftRound.picksInCurrentRound + 1,
  };
}

export function isRoundComplete(draftRound: DraftRoundRuntime): boolean {
  return draftRound.picksInCurrentRound >= draftRound.picksPerRound;
}

export function canAdvanceRound(draftRound: DraftRoundRuntime): boolean {
  return isRoundComplete(draftRound) && draftRound.currentRound < draftRound.totalRounds;
}

export function advanceDraftRound(
  draftRound: DraftRoundRuntime,
  nextEntity: DraftScopeEntityView,
): DraftRoundRuntime {
  return {
    ...draftRound,
    currentRound: draftRound.currentRound + 1,
    picksInCurrentRound: 0,
    currentEntity: nextEntity,
    usedEntityIds: [...draftRound.usedEntityIds, nextEntity.id],
  };
}
