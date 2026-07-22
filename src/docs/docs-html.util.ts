import { marked } from 'marked';

import { DocEntry, DocsService, ResolvedDocNavSection } from './docs.service';
import { injectFigmaPlaceholders, loadFigmaScreens } from './figma.util';

marked.setOptions({ gfm: true, breaks: false });

const PAGE_STYLES = `
  :root {
    color-scheme: dark;
    --bg: #0a0f1a;
    --surface: #111827;
    --border: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --accent-dim: #0ea5e9;
    --code-bg: #0d1526;
    --green: #4ade80;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.65;
  }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    min-height: 100vh;
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
    .sidebar { position: relative; max-height: none; }
  }
  .sidebar {
    background: var(--surface);
    border-right: 1px solid var(--border);
    padding: 24px 16px;
    position: sticky;
    top: 0;
    align-self: start;
    max-height: 100vh;
    overflow-y: auto;
  }
  .brand { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
  .brand-sub { margin: 0 0 20px; font-size: 13px; color: var(--muted); }
  .nav-section {
    margin: 18px 0 6px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .nav-link {
    display: block;
    padding: 7px 10px;
    border-radius: 8px;
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 2px;
  }
  .nav-link:hover { background: var(--bg); color: var(--text); text-decoration: none; }
  .nav-link.active { background: var(--bg); color: var(--accent); font-weight: 600; }
  main { padding: 32px 48px 80px; max-width: 960px; }
  .index-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-top: 24px;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
  }
  .card:hover { border-color: var(--accent-dim); }
  .card h2 { margin: 0 0 8px; font-size: 16px; }
  .card p { margin: 0; font-size: 13px; color: var(--muted); }
  .page-title { margin: 0 0 8px; font-size: 30px; }
  .page-lead { margin: 0 0 32px; color: var(--muted); font-size: 15px; max-width: 720px; }
  .markdown h1, .markdown h2, .markdown h3, .markdown h4 {
    margin-top: 1.8em; margin-bottom: 0.5em; line-height: 1.3;
  }
  .markdown h1 { font-size: 1.6rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
  .markdown h2 { font-size: 1.3rem; }
  .markdown h3 { font-size: 1.05rem; }
  .markdown p, .markdown ul, .markdown ol, .markdown blockquote { margin: 0 0 1em; }
  .markdown ul, .markdown ol { padding-left: 1.4em; }
  .markdown li { margin-bottom: 0.35em; }
  .markdown hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
  .markdown blockquote {
    border-left: 3px solid var(--accent-dim);
    margin-left: 0; padding: 0.5em 1em;
    color: var(--muted); background: var(--surface);
    border-radius: 0 8px 8px 0;
  }
  .markdown code {
    background: var(--code-bg); border: 1px solid var(--border);
    padding: 2px 6px; border-radius: 6px;
    font-size: 0.88em; color: var(--green);
  }
  .markdown pre {
    background: var(--code-bg); border: 1px solid var(--border);
    border-radius: 10px; padding: 16px; overflow-x: auto; margin: 0 0 1.2em;
  }
  .markdown pre code { background: none; border: none; padding: 0; color: var(--text); font-size: 0.85em; }
  .markdown table { width: 100%; border-collapse: collapse; margin: 0 0 1.2em; font-size: 14px; }
  .markdown th, .markdown td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
  .markdown th { background: var(--surface); }
  .badge {
    display: inline-block; font-size: 11px; padding: 2px 8px;
    border-radius: 999px; background: var(--surface);
    border: 1px solid var(--border); color: var(--muted); margin-right: 6px;
  }
  .swagger-link {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; padding: 4px 10px; border-radius: 6px;
    background: #172554; border: 1px solid #1d4ed8; color: #93c5fd;
    margin: 4px 0;
  }
  .swagger-link:hover { background: #1e3a8a; text-decoration: none; }
  .figma-panel {
    margin: 1.25em 0 1.75em;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--surface);
  }
  .figma-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--code-bg);
  }
  .figma-panel-label {
    margin: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #a78bfa;
  }
  .figma-panel-title {
    margin: 2px 0 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .figma-panel-link {
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 8px;
    background: #2e1065;
    border: 1px solid #6d28d9;
    color: #ddd6fe;
    text-decoration: none;
  }
  .figma-panel-link:hover {
    background: #4c1d95;
    text-decoration: none;
  }
  .figma-embed iframe {
    display: block;
    width: 100%;
    border: 0;
    background: #1e1e1e;
  }
`;

const SIDEBAR_SCROLL_SCRIPT = `
  (function () {
    var key = 'futziq-docs-sidebar-scroll';
    function init() {
      var sidebar = document.getElementById('docs-sidebar');
      if (!sidebar) return;
      var saved = sessionStorage.getItem(key);
      if (saved !== null) {
        sidebar.scrollTop = Number(saved);
      }
      sidebar.addEventListener('scroll', function () {
        sessionStorage.setItem(key, String(sidebar.scrollTop));
      }, { passive: true });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
`;

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildSidebar = (
  docsService: DocsService,
  entries: DocEntry[],
  activeSlug: string | null,
  docsPath: string,
): string => {
  const knownSlugs = new Set(entries.map((entry) => entry.slug));
  const sections = docsService.getNavSections();

  const sectionHtml = sections
    .map((section: ResolvedDocNavSection) => {
      const links = section.items
        .filter((item) => knownSlugs.has(item.slug))
        .map(
          (item) =>
            `<a class="nav-link${item.slug === activeSlug ? ' active' : ''}" href="${docsPath}/${item.slug}">${escapeHtml(item.title)}</a>`,
        )
        .join('\n');

      if (!links) return '';
      return `<div class="nav-section">${escapeHtml(section.title)}</div>\n${links}`;
    })
    .join('\n');

  return `
    <aside class="sidebar" id="docs-sidebar">
      <p class="brand">Futz IQ</p>
      <p class="brand-sub">Entegrasyon dokümanları</p>
      <a class="nav-link${activeSlug === null ? ' active' : ''}" href="${docsPath}">Ana sayfa</a>
      ${sectionHtml}
      <div class="nav-section">Araçlar</div>
      <a class="nav-link" href="/swagger" target="_blank" rel="noopener">Swagger UI ↗</a>
      <a class="nav-link" href="/swagger-json" target="_blank" rel="noopener">OpenAPI JSON ↗</a>
    </aside>
  `;
};

const DOCS_FAVICON = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/favicon-32x32.png';

const wrapPage = (params: { title: string; body: string; sidebar: string }): string =>
  `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" sizes="32x32" href="${DOCS_FAVICON}" />
    <title>${escapeHtml(params.title)} — Futz IQ Docs</title>
    <style>${PAGE_STYLES}</style>
  </head>
  <body>
    <div class="layout">
      ${params.sidebar}
      <main>${params.body}</main>
    </div>
    <script>${SIDEBAR_SCROLL_SCRIPT}</script>
  </body>
</html>`;

const rewriteDocLinks = (html: string, docsPath: string): string =>
  html.replace(
    /href="\.?\/?([a-z0-9-]+)\.md(#[^"]*)?"/gi,
    (_match, slug: string, anchor: string | undefined) =>
      `href="${docsPath}/${slug}${anchor ?? ''}"`,
  );

const shouldOpenInNewTab = (href: string): boolean => {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return true;
  }
  const path = href.split('#')[0]?.split('?')[0] ?? href;
  return path === '/swagger' || path === '/swagger-json';
};

const rewriteNewTabLinks = (html: string): string =>
  html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>/gi, (full, before, href, after) => {
    if (/target\s*=/i.test(full) || !shouldOpenInNewTab(href)) {
      return full;
    }
    return `<a${before}href="${href}"${after} target="_blank" rel="noopener noreferrer">`;
  });

export const buildDocsIndexHtml = (
  docsService: DocsService,
  entries: DocEntry[],
  docsPath: string,
): string => {
  const sections = docsService.getNavSections();
  const knownSlugs = new Set(entries.map((entry) => entry.slug));

  const cards = sections
    .flatMap((section) =>
      section.items
        .filter((item) => knownSlugs.has(item.slug))
        .map((item) => {
          const description =
            item.description ?? docsService.getNavDescription(item.slug) ?? section.title;
          return `
        <a class="card" href="${docsPath}/${item.slug}" style="display:block;color:inherit;text-decoration:none">
          <h2>${escapeHtml(item.title)}</h2>
          <p><span class="badge">${escapeHtml(section.title)}</span></p>
          <p style="margin-top:8px">${escapeHtml(description)}</p>
        </a>
      `;
        }),
    )
    .join('');

  const body = `
    <h1 class="page-title">Futz IQ — Entegrasyon Dokümanları</h1>
    <p class="page-lead">
      Flutter ve web ekipleri için uçtan uca API rehberi. Her sayfa hangi ekranda hangi isteğin
      atılacağını, örnek payload'ları ve Swagger referanslarını içerir.
    </p>
    <div class="index-grid">${cards}</div>
  `;

  return wrapPage({
    title: 'Entegrasyon',
    body,
    sidebar: buildSidebar(docsService, entries, null, docsPath),
  });
};

export const buildDocPageHtml = (params: {
  docsService: DocsService;
  slug: string;
  title: string;
  markdown: string;
  entries: DocEntry[];
  docsPath: string;
}): string => {
  const figmaManifest = loadFigmaScreens(params.docsService.getDocsDir());
  const parsed = rewriteNewTabLinks(
    rewriteDocLinks(marked.parse(params.markdown) as string, params.docsPath),
  );
  const html = injectFigmaPlaceholders(parsed, figmaManifest);
  const body = `<article class="markdown">${html}</article>`;

  return wrapPage({
    title: params.title,
    body,
    sidebar: buildSidebar(params.docsService, params.entries, params.slug, params.docsPath),
  });
};
