import { getCollection, type CollectionEntry } from 'astro:content';

export type FellowsArticle = {
  entry: CollectionEntry<'fellowsArticles'>;
  href: string;
};

function articleHref(pathSegment: string): string {
  return `/ehf-fellows-articles/${pathSegment}`;
}

async function buildFellowsArticles(): Promise<readonly FellowsArticle[]> {
  const entries = await getCollection('fellowsArticles');
  if (entries.length !== 4) {
    throw new Error(`fellowsArticles must hold exactly 4 records, found ${entries.length}`);
  }

  const byPathSegment = new Map(entries.map((entry) => [entry.data.pathSegment, entry] as const));
  if (byPathSegment.size !== entries.length) {
    throw new Error('fellowsArticles pathSegment values must be unique');
  }

  const linked = new Set(
    entries.flatMap((entry) => entry.data.nextPathSegment === null ? [] : [entry.data.nextPathSegment])
  );
  const heads = entries.filter((entry) => !linked.has(entry.data.pathSegment));
  if (heads.length !== 1) {
    throw new Error(`fellowsArticles next chain needs exactly one head, found ${heads.length}`);
  }

  const ordered: FellowsArticle[] = [];
  const seen = new Set<string>();
  let cursor: CollectionEntry<'fellowsArticles'> | undefined = heads[0];
  while (cursor) {
    const pathSegment = cursor.data.pathSegment;
    if (seen.has(pathSegment)) {
      throw new Error(`fellowsArticles next chain revisits ${pathSegment}`);
    }
    seen.add(pathSegment);
    ordered.push({ entry: cursor, href: articleHref(pathSegment) });

    const nextPathSegment = cursor.data.nextPathSegment;
    if (nextPathSegment === null) break;
    cursor = byPathSegment.get(nextPathSegment);
    if (!cursor) {
      throw new Error(`fellowsArticles next chain leaves the collection: ${pathSegment} -> ${nextPathSegment}`);
    }
  }

  if (ordered.length !== entries.length) {
    throw new Error(`fellowsArticles next chain covers ${ordered.length} of ${entries.length} records`);
  }
  return ordered;
}

let fellowsArticles: Promise<readonly FellowsArticle[]> | undefined;

/** Source listing order, reconstructed from the authoritative Next relation. */
export function loadFellowsArticles(): Promise<readonly FellowsArticle[]> {
  fellowsArticles ??= buildFellowsArticles();
  return fellowsArticles;
}

export function formatFellowsDate(publishedAt: string | undefined): string | undefined {
  if (!publishedAt) return undefined;
  const [year, month, day] = publishedAt.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
