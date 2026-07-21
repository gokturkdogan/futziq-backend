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

  listActiveFamilies() {
    return this.catalogRepository.findAllActiveFamilies();
  }

  getFamilyByCode(code: string) {
    return this.catalogRepository.findFamilyByCode(code);
  }

  resolvePlayConfig(input: { familyCode: string; gameCode: string; scopeCode?: string }) {
    return this.catalogRepository.resolvePlayConfig(input);
  }
}
