import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../common/locale/locale.constants';

@ApiTags('meta')
@Controller('api/v1/meta')
export class MetaController {
  @Get('locales')
  @ApiOperation({ summary: 'List supported API locales' })
  getLocales() {
    return {
      default: DEFAULT_LOCALE,
      supported: [...SUPPORTED_LOCALES],
    };
  }
}
