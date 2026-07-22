import { ApiProperty } from '@nestjs/swagger';

export class LocalesResponseDto {
  @ApiProperty({ example: 'tr' })
  default!: string;

  @ApiProperty({ example: ['tr', 'en'] })
  supported!: string[];
}

export class I18nBundleResponseDto {
  @ApiProperty({
    example: { 'errors.NOT_YOUR_TURN': 'Sıra sende değil' },
    description: 'Localized error messages keyed as errors.{CODE}',
  })
  errors!: Record<string, string>;

  @ApiProperty({
    example: { 'enums.performance.PERFECT': 'Mükemmel' },
    description: 'Localized enum labels keyed as enums.{category}.{VALUE}',
  })
  enums!: Record<string, string>;

  @ApiProperty({
    example: { 'slots.GK': 'Kaleci' },
    description: 'Localized lineup slot labels keyed as slots.{SLOT_CODE}',
  })
  slots!: Record<string, string>;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '2026-07-22T12:00:00.000Z' })
  timestamp!: string;
}
