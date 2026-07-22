import type { IncomingMessage, ServerResponse } from 'http';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import { getExpressApp } from '../src/serverless';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  try {
    const app = await getExpressApp();

    await new Promise<void>((resolve, reject) => {
      response.once('finish', resolve);
      response.once('close', resolve);
      response.once('error', reject);

      app(request as unknown as IncomingMessage, response as unknown as ServerResponse);
    });
  } catch (error) {
    console.error('[futziq-api] serverless bootstrap failed:', error);
    if (!response.headersSent) {
      response.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Server failed to start.',
        details: { error: error instanceof Error ? error.message : String(error) },
        traceId: 'bootstrap',
      });
    }
  }
}
