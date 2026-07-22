import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_CATALOG_REPOSITORY,
  GameCatalogRepository,
  GameFamilyDetailView,
} from '../domain/game-catalog.repository';
import { ClientViewMapper } from '../../client-contract/client-view.mapper';
import { GameFamilyDetailResponse } from '../../client-contract/types';

@Injectable()
export class GameCatalogService {
  constructor(
    @Inject(GAME_CATALOG_REPOSITORY)
    private readonly catalogRepository: GameCatalogRepository,
  ) {}

  listActiveFamilies(locale: string) {
    return this.catalogRepository.findAllActiveFamilies(locale);
  }

  async getFamilyByCode(code: string, locale: string): Promise<GameFamilyDetailResponse | null> {
    const family = await this.catalogRepository.findFamilyByCode(code, locale);
    if (!family) {
      return null;
    }
    return this.toFamilyResponse(family);
  }

  resolvePlayConfig(input: { familyCode: string; gameCode: string; scopeCode?: string }) {
    return this.catalogRepository.resolvePlayConfig(input);
  }

  private toFamilyResponse(family: GameFamilyDetailView): GameFamilyDetailResponse {
    return {
      id: family.id,
      code: family.code,
      title: family.title,
      description: family.description,
      imageUrl: family.imageUrl,
      logoUrl: family.logoUrl,
      sortOrder: family.sortOrder,
      catalogVersion: family.catalogVersion,
      games: family.games.map((game) => ClientViewMapper.toGameSummaryResponse(game, family.code)),
    };
  }
}
