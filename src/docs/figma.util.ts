import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface FigmaScreenConfig {
  title: string;
  figmaUrl: string;
  /** Official Figma embed URL (embed.figma.com). Preferred over auto-generated embed. */
  embedUrl?: string;
  embedWidth?: number;
  embedHeight?: number;
}

export interface FigmaScreensManifest {
  fileUrl?: string;
  fileTitle?: string;
  screens: Record<string, FigmaScreenConfig>;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildFigmaEmbedUrl(figmaUrl: string): string {
  const encoded = encodeURIComponent(figmaUrl);
  return `https://www.figma.com/embed?embed_host=share&url=${encoded}`;
}

export function loadFigmaScreens(docsDir: string): FigmaScreensManifest | null {
  const manifestPath = join(docsDir, 'figma-screens.json');
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as FigmaScreensManifest;
  } catch {
    return null;
  }
}

export function buildFigmaPanelHtml(screen: FigmaScreenConfig): string {
  const embedUrl = screen.embedUrl ?? buildFigmaEmbedUrl(screen.figmaUrl);
  const height = screen.embedHeight ?? 450;
  const width = screen.embedWidth ?? '100%';
  const widthStyle = typeof width === 'number' ? `${width}px` : width;

  return `
    <div class="figma-panel">
      <div class="figma-panel-header">
        <div>
          <p class="figma-panel-label">Figma</p>
          <p class="figma-panel-title">${escapeHtml(screen.title)}</p>
        </div>
        <a class="figma-panel-link" href="${escapeHtml(screen.figmaUrl)}" target="_blank" rel="noopener noreferrer">
          Figma'da aç ↗
        </a>
      </div>
      <div class="figma-embed">
        <iframe
          src="${escapeHtml(embedUrl)}"
          title="${escapeHtml(screen.title)} — Figma önizleme"
          allowfullscreen
          loading="lazy"
          style="width:${widthStyle};max-width:100%;height:${height}px;border:1px solid rgba(0,0,0,0.1)"
        ></iframe>
      </div>
    </div>
  `;
}

export function injectFigmaPlaceholders(html: string, manifest: FigmaScreensManifest | null): string {
  if (!manifest?.screens) {
    return html;
  }

  return html.replace(/\{\{figma:([a-z0-9-]+)\}\}/gi, (_match, key: string) => {
    const screen = manifest.screens[key];
    if (!screen) {
      return `<!-- figma:${key} not configured -->`;
    }
    return buildFigmaPanelHtml(screen);
  });
}
