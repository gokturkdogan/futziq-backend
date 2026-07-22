export interface GameScopeSummaryView {
  id: string;
  code: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface GameSummaryView {
  id: string;
  code: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  bannerImageUrl: string | null;
  sortOrder: number;
  requiresScope: boolean;
  scopes: GameScopeSummaryView[] | null;
  config: unknown | null;
}

export interface GameFamilySummaryView {
  id: string;
  code: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  sortOrder: number;
}

export interface GameFamilyDetailView extends GameFamilySummaryView {
  catalogVersion: string;
  games: GameSummaryView[];
}

export interface ResolvedPlayConfig {
  familyCode: string;
  gameId: string;
  gameCode: string;
  scopeId: string | null;
  scopeCode: string | null;
  gameScopeRuleId: string | null;
  config: unknown;
}

export interface GameCatalogRepository {
  findAllActiveFamilies(locale: string): Promise<GameFamilySummaryView[]>;
  findFamilyByCode(code: string, locale: string): Promise<GameFamilyDetailView | null>;
  resolvePlayConfig(input: {
    familyCode: string;
    gameCode: string;
    scopeCode?: string;
  }): Promise<ResolvedPlayConfig | null>;
}

export const GAME_CATALOG_REPOSITORY = Symbol('GAME_CATALOG_REPOSITORY');
