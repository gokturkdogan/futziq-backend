import { Logger } from '@nestjs/common';
import type { Express, Request, Response } from 'express';

import { buildDocPageHtml, buildDocsIndexHtml } from './docs-html.util';
import { DocsService } from './docs.service';

const sendHtml = (res: Response, html: string): void => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

export const setupDocsRoutes = (expressApp: Express, logger: Logger): void => {
  const docsService = new DocsService();
  const docsPath = '/docs';
  const docCount = docsService.listDocs().length;

  if (docCount === 0) {
    logger.warn(
      `No markdown docs found under ${docsService.getDocsDir()}. Check that nest build copied docs assets to dist/docs.`,
    );
  } else {
    logger.log(`Loaded ${docCount} documentation pages from ${docsService.getDocsDir()}`);
  }

  expressApp.get(docsPath, (_req: Request, res: Response) => {
    const entries = docsService.listDocs();
    sendHtml(res, buildDocsIndexHtml(docsService, entries, docsPath));
  });

  expressApp.get(`${docsPath}/raw/:slug`, (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const { markdown } = docsService.getMarkdown(slug);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(markdown);
    } catch {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Documentation page not found.' });
    }
  });

  expressApp.get(`${docsPath}/:slug`, (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug);
      const doc = docsService.getMarkdown(slug);
      const entries = docsService.listDocs();
      sendHtml(
        res,
        buildDocPageHtml({
          docsService,
          slug: doc.slug,
          title: doc.title,
          markdown: doc.markdown,
          entries,
          docsPath,
        }),
      );
    } catch {
      res.status(404);
      sendHtml(
        res,
        buildDocsIndexHtml(docsService, docsService.listDocs(), docsPath).replace(
          '<h1 class="page-title">Futz IQ — Entegrasyon Dokümanları</h1>',
          '<h1 class="page-title">Sayfa bulunamadı</h1><p class="page-lead">İstenen doküman mevcut değil.</p>',
        ),
      );
    }
  });

  logger.log(`Integration docs available at ${docsPath}`);
};
