import { Inject, Injectable } from '@nestjs/common';
import {
  GAME_CATALOG_REPOSITORY,
  GameCatalogRepository,
} from '../domain/game-catalog.repository';

@Injectable()
export class GameCatalogService {
  constructor(
    @Inject(GAME_CATALOG_REPOSITORY)
    private readonly catalogRepository: GameCatalogRepository,
  ) {}

  listActiveFamilies(locale: string) {
    return this.catalogRepository.findAllActiveFamilies(locale);
  }

  getFamilyByCode(code: string, locale: string) {
    return this.catalogRepository.findFamilyByCode(code, locale);
  }

  resolvePlayConfig(input: { familyCode: string; gameCode: string; scopeCode?: string }) {
    return this.catalogRepository.resolvePlayConfig(input);
  }
}
