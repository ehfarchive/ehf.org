import { getCollection, type CollectionEntry } from 'astro:content';
import contentManifestInput from '../../../source-evidence/content-manifest.json';
import routeManifestInput from '../../../source-evidence/route-manifest.json';
import { parseStrictUtcIsoDate } from '../../lib/iso-date';
import { NEWS_ARTICLE_COUNT } from '../../lib/news';
import type { ContentManifest, LocalContentManifestRecord } from '../../lib/page-data';
import { validateContentManifest } from '../../lib/page-data';
import { loadRouteManifest } from '../../lib/route-manifest';

export type NewsEntry = CollectionEntry<'news'>;
export type NewsArticle = { entry: NewsEntry; path: string; publishedAt: Date };

const routeManifest = loadRouteManifest(routeManifestInput);
const contentManifest = contentManifestInput as ContentManifest;
const contentErrors = validateContentManifest(contentManifest);
if (contentErrors.length > 0) throw new Error(contentErrors.join('; '));

const articlePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'news-article')
  .map((route) => route.path);
const contentRecords = contentManifest.content
  .filter((record): record is LocalContentManifestRecord => record.template === 'news-article');

if (articlePaths.length !== NEWS_ARTICLE_COUNT || new Set(articlePaths).size !== NEWS_ARTICLE_COUNT) {
  throw new Error(`News manifest must declare exactly ${NEWS_ARTICLE_COUNT} unique articles`);
}
if (contentRecords.length !== NEWS_ARTICLE_COUNT || new Set(contentRecords.map((record) => record.localInput)).size !== NEWS_ARTICLE_COUNT) {
  throw new Error(`News content manifest must declare exactly ${NEWS_ARTICLE_COUNT} unique local inputs`);
}

const pathByInput = new Map(contentRecords.map((record) => [record.localInput, record.route] as const));
const pathSet = new Set(articlePaths);

export async function loadNewsArticles(): Promise<readonly NewsArticle[]> {
  const articles: NewsArticle[] = (await getCollection('news')).map((entry) => {
    const path = pathByInput.get(`src/content/news/${entry.id}.md`);
    const publishedAt = entry.data.publishedAt;
    if (!path || !pathSet.has(path)) throw new Error(`News entry is not declared by the manifests: ${entry.id}`);
    if (typeof publishedAt !== 'string') throw new Error(`News entry ${entry.id}.publishedAt must be a valid ISO calendar date`);
    return { entry, path, publishedAt: parseStrictUtcIsoDate(publishedAt, `News entry ${entry.id}.publishedAt`) };
  });

  if (articles.length !== NEWS_ARTICLE_COUNT || articles.length !== pathSet.size || articles.length !== pathByInput.size
    || new Set(articles.map((article) => article.entry.id)).size !== articles.length
    || new Set(articles.map((article) => article.path)).size !== articles.length) {
    throw new Error('News manifests and typed collection entries do not agree');
  }

  return articles.sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime()
    || left.entry.id.localeCompare(right.entry.id));
}

export function formatNewsDate(publishedAt: Date): string {
  return `${publishedAt.getUTCMonth() + 1}/${publishedAt.getUTCDate()}/${String(publishedAt.getUTCFullYear()).slice(-2)}`;
}
