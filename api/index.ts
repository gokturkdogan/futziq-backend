import type { IncomingMessage, ServerResponse } from 'http';

import { createApp } from '../dist/create-app';

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedServer: ExpressHandler | undefined;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!cachedServer) {
    const app = await createApp();
    cachedServer = app.getHttpAdapter().getInstance() as ExpressHandler;
  }

  cachedServer(req, res);
}
