import { Module } from '@nestjs/common';
import { MetaController } from './presentation/meta.controller';
import { I18nBundleService } from './application/i18n-bundle.service';

@Module({
  controllers: [MetaController],
  providers: [I18nBundleService],
  exports: [I18nBundleService],
})
export class MetaModule {}
