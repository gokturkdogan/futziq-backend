import { Controller, Get, Query } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../common/locale/locale.constants';
import { Locale } from '../../common/locale/locale.decorator';
import { I18nBundleService } from '../application/i18n-bundle.service';
import { I18nBundleResponseDto, LocalesResponseDto } from '../../common/swagger/meta-response.dto';

@ApiTags('meta')
@ApiHeader({
  name: 'Accept-Language',
  description: 'Fallback when `locale` query param is omitted',
  required: false,
})
@Controller('api/v1/meta')
export class MetaController {
  constructor(private readonly i18nBundleService: I18nBundleService) {}

  @Get('locales')
  @ApiOperation({ summary: 'List supported API locales' })
  @ApiOkResponse({ type: LocalesResponseDto })
  getLocales() {
    return {
      default: DEFAULT_LOCALE,
      supported: [...SUPPORTED_LOCALES],
    };
  }

  @Get('i18n-bundle')
  @ApiOperation({
    summary: 'Get localized errors, enums, and slot labels',
    description:
      'Flutter/web clients can merge into ARB or runtime Map. Keys: `errors.*`, `enums.*`, `slots.*`.',
  })
  @ApiQuery({ name: 'locale', required: false, enum: ['tr', 'en'], example: 'tr' })
  @ApiOkResponse({ type: I18nBundleResponseDto })
  getI18nBundle(@Query('locale') queryLocale: string | undefined, @Locale() locale: string) {
    return this.i18nBundleService.getBundle(queryLocale ?? locale);
  }

  @Get('enums')
  @ApiOperation({ summary: 'Get localized enum labels only' })
  @ApiQuery({ name: 'locale', required: false, enum: ['tr', 'en'] })
  @ApiOkResponse({
    schema: {
      type: 'object',
      additionalProperties: { type: 'string' },
      example: { 'enums.performance.PERFECT': 'Mükemmel' },
    },
  })
  getEnums(@Query('locale') queryLocale: string | undefined, @Locale() locale: string) {
    return this.i18nBundleService.getEnums(queryLocale ?? locale);
  }
}
