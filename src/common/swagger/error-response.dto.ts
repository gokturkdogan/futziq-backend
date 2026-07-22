import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    example: 'STATE_VERSION_CONFLICT',
    description: 'Machine-readable error code. Map to localized UI strings on the client.',
  })
  code!: string;

  @ApiProperty({
    example: 'State version conflict. Refresh and retry.',
    description: 'English debug message. Do not show in production UI.',
  })
  message!: string;

  @ApiProperty({
    example: { expected: 0, actual: 1 },
    description: 'Optional structured context for the error.',
  })
  details!: Record<string, unknown>;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  traceId!: string;
}

export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  declare code: string;
}
