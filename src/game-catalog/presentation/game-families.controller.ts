import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Locale } from '../../common/locale/locale.decorator';
import { DomainException, ErrorCode } from '../../common/errors/domain.exception';
import { GameCatalogService } from '../application/game-catalog.service';
import {
  GameFamilyDetailResponseDto,
  GameFamilySummaryResponseDto,
} from './dto/catalog-response.dto';
import { ErrorResponseDto } from '../../common/swagger/error-response.dto';

@ApiTags('game-families')
@ApiHeader({
  name: 'Accept-Language',
  description: 'Preferred locale (`tr` or `en`). Defaults to `tr`.',
  required: false,
  example: 'tr',
})
@Controller('api/v1/game-families')
export class GameFamiliesController {
  constructor(private readonly catalogService: GameCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'List active game families (categories)',
    description: 'Lobby/home screen. Does not include games or capabilities — fetch family detail next.',
  })
  @ApiOkResponse({ type: GameFamilySummaryResponseDto, isArray: true })
  list(@Locale() locale: string) {
    return this.catalogService.listActiveFamilies(locale);
  }

  @Get(':code')
  @ApiOperation({
    summary: 'Get family detail with games, scopes, and capabilities',
    description:
      'Each game includes `capabilities` manifest for UI setup. `catalogVersion` + locale key for client cache. ' +
      'Scope with `imageUrl: null` is RANDOM — send `scopeCode: RANDOM` on session create.',
  })
  @ApiParam({ name: 'code', enum: ['TARGET_HUNT', 'DRAFT'] })
  @ApiOkResponse({ type: GameFamilyDetailResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'GAME_FAMILY_NOT_FOUND' })
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
