import { getCollection, type CollectionEntry } from 'astro:content';
import routeManifestInput from '../../../source-evidence/route-manifest.json';
import { loadRouteManifest } from '../../lib/route-manifest';

export const WATCH_PAGE_SIZE = 20;

export type WatchEntry = {
  entry: CollectionEntry<'watch'>;
  slug: string;
  path: string;
};

/**
 * A page of the source listing, keyed by the Squarespace publish cursors the
 * source paints on its Older/Newer links. `offset` is the cursor that walks
 * forward (older) onto this page; `reverseOffset` is the cursor the following
 * page's Newer link carries to walk back onto it. Page 1 is reached with a bare
 * `/watch`, and nothing walks back onto page 5, so those two are null.
 */
export type WatchListingPage = {
  number: number;
  offset: string | null;
  reverseOffset: string | null;
};

export const WATCH_LISTING_PAGES: readonly WatchListingPage[] = [
  { number: 1, offset: null, reverseOffset: '1659267474238' },
  { number: 2, offset: '1659267549153', reverseOffset: '1659265974641' },
  { number: 3, offset: '1659266035329', reverseOffset: '1659264499282' },
  { number: 4, offset: '1659264616483', reverseOffset: '1659260807514' },
  { number: 5, offset: '1659260880714', reverseOffset: null }
];

export function watchListingHref(page: WatchListingPage): string {
  return page.offset === null ? '/watch' : `/watch?offset=${page.offset}`;
}

export function watchListingReverseHref(page: WatchListingPage): string {
  if (page.reverseOffset === null) throw new Error(`watch page ${page.number} carries no reverse cursor`);
  return `/watch?offset=${page.reverseOffset}&reversePaginate=true`;
}

const routeManifest = loadRouteManifest(routeManifestInput);

const declaredWatchSlugs = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'watch-article')
  .map((route) => route.path.slice('/watch/'.length));

/**
 * Source order is Squarespace's publish cursor, which is finer grained than the
 * calendar dates the collection carries — every record is dated 2022-08-01, so
 * sorting on `publishedAt` cannot reproduce it. The source states the same order
 * losslessly through each detail page's Next relation, so the listing walks that
 * chain from its head instead.
 */
async function buildWatchEntries(): Promise<readonly WatchEntry[]> {
  const entries = await getCollection('watch');
  const byId = new Map(entries.map((entry) => [entry.id, entry] as const));

  for (const slug of declaredWatchSlugs) {
    if (!byId.has(slug)) throw new Error(`missing watch record for declared route: /watch/${slug}`);
  }
  if (entries.length !== declaredWatchSlugs.length) {
    throw new Error(`watch collection holds ${entries.length} records for ${declaredWatchSlugs.length} declared routes`);
  }

  const linked = new Set(entries.map((entry) => entry.data.nextSlug).filter((slug): slug is string => slug !== null));
  const heads = entries.filter((entry) => !linked.has(entry.id));
  if (heads.length !== 1) throw new Error(`watch next chain needs exactly one head, found ${heads.length}`);

  const ordered: WatchEntry[] = [];
  const seen = new Set<string>();
  let cursor: CollectionEntry<'watch'> | undefined = heads[0];
  while (cursor) {
    if (seen.has(cursor.id)) throw new Error(`watch next chain revisits ${cursor.id}`);
    seen.add(cursor.id);
    ordered.push({ entry: cursor, slug: cursor.id, path: `/watch/${cursor.id}` });
    const next = cursor.data.nextSlug;
    if (next === null) break;
    const target = byId.get(next);
    if (!target) throw new Error(`watch nextSlug leaves the collection: ${cursor.id} -> ${next}`);
    cursor = target;
  }
  if (ordered.length !== entries.length) {
    throw new Error(`watch next chain covers ${ordered.length} of ${entries.length} records`);
  }
  return ordered;
}

let watchEntries: Promise<readonly WatchEntry[]> | undefined;

/** Every watch record, newest first, in the source's own listing order. */
export function loadWatchEntries(): Promise<readonly WatchEntry[]> {
  watchEntries ??= buildWatchEntries();
  return watchEntries;
}
