import type { INestApplication } from '@nestjs/common';
import type { Express } from 'express';

import { createApp } from './create-app';

let cachedApp: Express | undefined;
let initPromise: Promise<Express> | undefined;

export function getExpressApp(): Promise<Express> {
  if (cachedApp) {
    return Promise.resolve(cachedApp);
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        const nestApp: INestApplication = await createApp();
        cachedApp = nestApp.getHttpAdapter().getInstance() as Express;
        return cachedApp;
      } catch (error) {
        initPromise = undefined;
        throw error;
      }
    })();
  }

  return initPromise;
}
