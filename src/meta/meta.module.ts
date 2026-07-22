import { Module } from '@nestjs/common';
import { MetaController } from './presentation/meta.controller';

@Module({
  controllers: [MetaController],
})
export class MetaModule {}
