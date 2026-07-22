import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';

import { createApp, createExpressApp } from './create-app';

let cachedApp: Express | undefined;
let initPromise: Promise<Express> | undefined;

export function getExpressApp(): Promise<Express> {
  if (cachedApp) {
    return Promise.resolve(cachedApp);
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const expressApp = createExpressApp();
        const nestApp: INestApplication = await createApp(expressApp);
        await nestApp.init();
        await nestApp.flushLogs();
        cachedApp = expressApp;
        return expressApp;
      } catch (error) {
        initPromise = undefined;
        throw error;
      }
    })();
  }

  return initPromise;
}
