import { Controller, Get, Param } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Locale } from '../../common/locale/locale.decorator';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { GameCatalogService } from '../application/game-catalog.service';

@ApiTags('game-families')
@ApiHeader({
  name: 'Accept-Language',
  description: 'Preferred locale (tr or en). Defaults to tr.',
  required: false,
})
@Controller('api/v1/game-families')
export class GameFamiliesController {
  constructor(private readonly catalogService: GameCatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List active game families (categories only)' })
  list(@Locale() locale: string) {
    return this.catalogService.listActiveFamilies(locale);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get family detail with games and available scopes' })
  @ApiResponse({ status: 404, description: 'GAME_FAMILY_NOT_FOUND' })
  async getByCode(@Param('code') code: string, @Locale() locale: string) {
    const family = await this.catalogService.getFamilyByCode(code, locale);
    if (!family) {
      throw new DomainException(
        ErrorCode.GAME_FAMILY_NOT_FOUND,
        `Game family not found: ${code}`,
      );
    }
    return family;
  }
}
