import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request & { traceId?: string }, res: Response, next: NextFunction): void {
    const traceId = (req.headers['x-trace-id'] as string) ?? uuidv4();
    req.traceId = traceId;
    res.setHeader('X-Trace-Id', traceId);
    next();
  }
}
