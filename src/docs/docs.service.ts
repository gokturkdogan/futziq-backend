import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface DocEntry {
  slug: string;
  title: string;
  filename: string;
}

export interface DocNavItem {
  slug: string;
  title?: string;
  description?: string;
}

export interface DocNavSection {
  title: string;
  slugs?: string[];
  items?: DocNavItem[];
}

export interface ResolvedDocNavItem {
  slug: string;
  title: string;
  description?: string;
}

export interface ResolvedDocNavSection {
  title: string;
  items: ResolvedDocNavItem[];
}

export interface DocsManifest {
  sections: DocNavSection[];
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const PINNED_SLUG = 'overview';
const GENERIC_NAV_PREFIXES = ['API', 'Flutter', 'Web (Nuxt)', 'Futz IQ'];

export class DocsService {
  private readonly docsDir: string;
  private manifestTitles = new Map<string, string>();
  private manifestDescriptions = new Map<string, string>();

  constructor() {
    this.docsDir = this.resolveDocsDir();
    this.loadManifestMetadata();
  }

  getDocsDir(): string {
    return this.docsDir;
  }

  listDocs(): DocEntry[] {
    if (!existsSync(this.docsDir)) {
      return [];
    }

    return readdirSync(this.docsDir)
      .filter((name) => name.endsWith('.md') && !name.startsWith('_'))
      .map((filename) => {
        const slug = filename.replace(/\.md$/, '');
        const title = this.getNavTitle(slug, this.readFile(filename));
        return { slug, title, filename };
      })
      .sort((a, b) => {
        if (a.slug === PINNED_SLUG) return -1;
        if (b.slug === PINNED_SLUG) return 1;
        return a.title.localeCompare(b.title, 'tr');
      });
  }

  getNavSections(): ResolvedDocNavSection[] {
    const manifestPath = join(this.docsDir, '_manifest.json');
    if (!existsSync(manifestPath)) {
      return [
        {
          title: 'Dokümanlar',
          items: this.listDocs().map((doc) => ({
            slug: doc.slug,
            title: doc.title,
          })),
        },
      ];
    }

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DocsManifest;
      return (manifest.sections ?? [])
        .map((section) => ({
          title: section.title,
          items: this.resolveSectionItems(section),
        }))
        .filter((section) => section.items.length > 0);
    } catch {
      return [
        {
          title: 'Dokümanlar',
          items: this.listDocs().map((doc) => ({
            slug: doc.slug,
            title: doc.title,
          })),
        },
      ];
    }
  }

  getNavTitle(slug: string, markdown?: string): string {
    const manifestTitle = this.manifestTitles.get(slug);
    if (manifestTitle) {
      return manifestTitle;
    }

    const content = markdown ?? this.safeReadMarkdown(slug);
    if (!content) {
      return slug;
    }

    return this.extractNavTitle(content);
  }

  getNavDescription(slug: string): string | undefined {
    return this.manifestDescriptions.get(slug);
  }

  getMarkdown(slug: string): { slug: string; title: string; markdown: string } {
    this.assertValidSlug(slug);
    const markdown = this.readFile(`${slug}.md`);
    return {
      slug,
      title: this.extractPageTitle(markdown),
      markdown,
    };
  }

  private loadManifestMetadata(): void {
    const manifestPath = join(this.docsDir, '_manifest.json');
    if (!existsSync(manifestPath)) {
      return;
    }

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DocsManifest;
      for (const section of manifest.sections ?? []) {
        for (const item of this.resolveSectionItems(section)) {
          this.manifestTitles.set(item.slug, item.title);
          if (item.description) {
            this.manifestDescriptions.set(item.slug, item.description);
          }
        }
      }
    } catch {
      // Fall back to markdown titles when manifest is invalid.
    }
  }

  private resolveSectionItems(section: DocNavSection): ResolvedDocNavItem[] {
    if (section.items?.length) {
      return section.items.map((item) => ({
        slug: item.slug,
        title: item.title ?? this.getNavTitle(item.slug),
        description: item.description,
      }));
    }

    return (section.slugs ?? []).map((slug) => ({
      slug,
      title: this.getNavTitle(slug),
      description: this.manifestDescriptions.get(slug),
    }));
  }

  private safeReadMarkdown(slug: string): string | null {
    try {
      return this.readFile(`${slug}.md`);
    } catch {
      return null;
    }
  }

  private readFile(filename: string): string {
    const filePath = join(this.docsDir, filename);
    if (!existsSync(filePath)) {
      throw new Error(`Documentation page not found: ${filename}`);
    }
    return readFileSync(filePath, 'utf-8');
  }

  private assertValidSlug(slug: string): void {
    if (!SLUG_PATTERN.test(slug)) {
      throw new Error('Documentation page not found.');
    }
  }

  /** Full H1 for page header and browser tab. */
  private extractPageTitle(markdown: string): string {
    const match = /^#\s+(.+)$/m.exec(markdown);
    if (!match) {
      return 'Untitled';
    }
    return match[1].trim();
  }

  /** Short label for sidebar when manifest title is not set. */
  private extractNavTitle(markdown: string): string {
    const fullTitle = this.extractPageTitle(markdown);
    const parts = fullTitle.split(/\s*—\s*/);
    if (parts.length < 2) {
      return fullTitle;
    }

    const [prefix, ...rest] = parts;
    const suffix = rest.join(' — ').trim();
    if (GENERIC_NAV_PREFIXES.includes(prefix.trim())) {
      return suffix;
    }

    return prefix.trim();
  }

  private resolveDocsDir(): string {
    const candidates = [
      __dirname,
      join(__dirname, '..', '..', 'docs'),
      join(process.cwd(), 'dist', 'docs'),
      join(process.cwd(), 'docs'),
    ];

    const found = candidates.find((dir) => this.isDocsContentDir(dir));
    return found ?? __dirname;
  }

  private isDocsContentDir(dir: string): boolean {
    if (!existsSync(dir)) {
      return false;
    }

    return (
      existsSync(join(dir, '_manifest.json')) ||
      existsSync(join(dir, 'overview.md')) ||
      readdirSync(dir).some((name) => name.endsWith('.md') && !name.startsWith('_'))
    );
  }
}
