import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface CatalogMediaFields {
  imageUrl?: string | null;
  logoUrl?: string | null;
  bannerImageUrl?: string | null;
}

export interface CatalogMediaFile {
  families: Record<string, CatalogMediaFields>;
  games: Record<string, CatalogMediaFields>;
  scopes: Record<string, CatalogMediaFields>;
}

const MEDIA_FILE = join(__dirname, 'catalog-media.snapshot.json');

export function isRemoteMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

export function loadCatalogMediaFile(): CatalogMediaFile {
  if (!existsSync(MEDIA_FILE)) {
    return { families: {}, games: {}, scopes: {} };
  }

  const raw = readFileSync(MEDIA_FILE, 'utf8');
  return JSON.parse(raw) as CatalogMediaFile;
}

export function gameMediaKey(familyCode: string, gameCode: string): string {
  return `${familyCode}:${gameCode}`;
}

/**
 * Picks the best media URL without downgrading CDN/remote URLs to local seed placeholders.
 * Priority: exported catalog-media.json → existing DB value → seed default.
 */
export function resolveMediaUrl(
  seedUrl: string | null | undefined,
  exportedUrl: string | null | undefined,
  existingUrl: string | null | undefined,
): string | null {
  const candidates = [exportedUrl, existingUrl, seedUrl];

  for (const candidate of candidates) {
    if (candidate && isRemoteMediaUrl(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return null;
}
