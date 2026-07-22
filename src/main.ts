import { createApp } from './create-app';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  await app.init();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
