import { getCollection, type CollectionEntry } from 'astro:content';
import { impactArchive } from '../../data/impactArchive';
import contentManifestInput from '../../../source-evidence/content-manifest.json';
import routeManifestInput from '../../../source-evidence/route-manifest.json';
import type { ContentManifest, LocalContentManifestRecord } from '../../lib/page-data';
import { validateContentManifest } from '../../lib/page-data';
import { loadRouteManifest } from '../../lib/route-manifest';
import { assetIdForLocalPath } from '../../data/site';

export const IMPACT_PAGE_SIZE = 20;

type ImpactEntry = CollectionEntry<'impact'>;

export type ImpactArticle = {
  entry: ImpactEntry;
  path: string;
};

export type ImpactCardImage = {
  localPath: string;
  focal: string;
  landscape: boolean;
};

const routeManifest = loadRouteManifest(routeManifestInput);
const contentManifest = contentManifestInput as ContentManifest;
const contentErrors = validateContentManifest(contentManifest);
if (contentErrors.length > 0) throw new Error(contentErrors.join('; '));

const impactArticlePaths = new Set(
  routeManifest.routes
    .filter((route) => route.kind === 'included' && route.family === 'impact-article')
    .map((route) => route.path)
);
const impactContentByInput = new Map(
  contentManifest.content
    .filter((record): record is LocalContentManifestRecord => record.template === 'impact-article')
    .map((record) => [record.localInput, record] as const)
);
function isDraft(entry: ImpactEntry): boolean {
  const data: object = entry.data;
  return 'draft' in data && data.draft === true;
}

export function plainImpactExcerpt(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const sourceCardsByPath = new Map(
  impactArchive.map((card) => [card.href, {
    localPath: card.image,
    focal: card.focal,
    landscape: card.landscape === true
  }] as const)
);

export function sourceCardForImpactPath(path: string): ImpactCardImage | undefined {
  return sourceCardsByPath.get(path);
}

export type ImpactFigureAlignment = 'left' | 'right';

const archivedFigureAlignments: Record<string, readonly ImpactFigureAlignment[]> = {
  'how-chemergy-is-changing-the-game-in-waste-to-energy': ['right']
};

function firstMarkdownImageAssetId(body: string): string | undefined {
  const match = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/.exec(body);
  const reference = match?.[1] ?? match?.[2];
  if (!reference) return undefined;

  try {
    const localPath = decodeURIComponent(new URL(reference, 'https://local.invalid').pathname);
    return assetIdForLocalPath(localPath);
  } catch {
    return undefined;
  }
}

export function featuredImageIsFirstBodyFigure(article: ImpactArticle): boolean {
  const heroImage = article.entry.data.heroImage;
  if (typeof heroImage !== 'string' || typeof article.entry.body !== 'string') return false;
  return firstMarkdownImageAssetId(article.entry.body) === assetIdForLocalPath(heroImage);
}

export function archivedFigureAlignmentsForImpactArticle(article: ImpactArticle): readonly ImpactFigureAlignment[] {
  return archivedFigureAlignments[article.entry.id] ?? [];
}

export async function loadImpactArticles(): Promise<readonly ImpactArticle[]> {
  const entries = await getCollection('impact');
  const articles = entries
    .filter((entry) => !isDraft(entry))
    .map((entry) => {
      const localInput = `src/content/impact/${entry.id}.md`;
      const record = impactContentByInput.get(localInput);
      if (!record || !impactArticlePaths.has(record.route)) {
        throw new Error(`Impact entry is not declared by the manifests: ${entry.id}`);
      }
      return { entry, path: record.route };
    })
    .sort((left, right) => {
      const byDate = right.entry.data.publishedAt!.localeCompare(left.entry.data.publishedAt!);
      return byDate || left.entry.id.localeCompare(right.entry.id);
    });

  if (articles.length !== impactArticlePaths.size || articles.length !== impactContentByInput.size) {
    throw new Error('Impact manifests and typed collection entries do not agree');
  }
  return articles;
}

export function impactListingPagePaths(): readonly number[] {
  return routeManifest.routes
    .filter((route) => route.kind === 'included' && route.family === 'impact-listing')
    .map((route) => route.path)
    .filter((path) => /^\/read\/page\/[1-9]\d*$/.test(path))
    .map((path) => Number(path.slice('/read/page/'.length)));
}

export function isDeclaredImpactArticlePath(path: string): boolean {
  return impactArticlePaths.has(path);
}
