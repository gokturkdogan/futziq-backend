import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException, ErrorCode } from './domain.exception';

interface ErrorResponse {
  code: string;
  message: string;
  details: Record<string, unknown>;
  traceId: string;
}

const DOMAIN_STATUS_MAP: Record<ErrorCode, HttpStatus> = {
  [ErrorCode.GAME_DEFINITION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GAME_FAMILY_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GAME_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GAME_SCOPE_REQUIRED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INVALID_GAME_SCOPE_COMBINATION]: HttpStatus.BAD_REQUEST,
  [ErrorCode.GAME_DEFINITION_INACTIVE]: HttpStatus.BAD_REQUEST,
  [ErrorCode.GAME_SESSION_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.GAME_SESSION_NOT_ACTIVE]: HttpStatus.CONFLICT,
  [ErrorCode.PLAYER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.PLAYER_NOT_ELIGIBLE]: HttpStatus.BAD_REQUEST,
  [ErrorCode.PLAYER_ALREADY_SELECTED]: HttpStatus.CONFLICT,
  [ErrorCode.SELECTION_LIMIT_REACHED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INVALID_GAME_ACTION]: HttpStatus.BAD_REQUEST,
  [ErrorCode.ACTION_ALREADY_PROCESSED]: HttpStatus.CONFLICT,
  [ErrorCode.STATE_VERSION_CONFLICT]: HttpStatus.CONFLICT,
  [ErrorCode.METRIC_VALUE_MISSING]: HttpStatus.BAD_REQUEST,
  [ErrorCode.RESULT_NOT_AVAILABLE]: HttpStatus.NOT_FOUND,
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { traceId?: string }>();
    const traceId = request.traceId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorResponse = {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
      details: {},
      traceId,
    };

    if (exception instanceof DomainException) {
      status = DOMAIN_STATUS_MAP[exception.code] ?? HttpStatus.BAD_REQUEST;
      body = {
        code: exception.code,
        message: exception.message,
        details: exception.details,
        traceId,
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as { message?: string | string[] }).message ?? exception.message);
      body = {
        code: ErrorCode.VALIDATION_ERROR,
        message: Array.isArray(message) ? message.join(', ') : String(message),
        details: typeof res === 'object' ? (res as Record<string, unknown>) : {},
        traceId,
      };
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    response.status(status).json(body);
  }
}
