import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GameCatalogService } from '../application/game-catalog.service';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';

@ApiTags('game-families')
@Controller('api/v1/game-families')
export class GameFamiliesController {
  constructor(private readonly catalogService: GameCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List active game families (categories only)' })
  list() {
    return this.catalogService.listActiveFamilies();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get family detail with games and available scopes' })
  @ApiResponse({ status: 404, description: 'GAME_FAMILY_NOT_FOUND' })
  async getByCode(@Param('code') code: string) {
    const family = await this.catalogService.getFamilyByCode(code);
    if (!family) {
      throw new DomainException(
        ErrorCode.GAME_FAMILY_NOT_FOUND,
        `Game family not found: ${code}`,
      );
    }
    return family;
  }
}
