import type { IncludedRouteRecord, RouteManifest, TemplateFamily } from './route-manifest';

type GeneratedTemplate = Extract<TemplateFamily, 'homepage' | 'impact-listing' | 'news-listing' | 'archive' | 'not-found'>;
type LocalTemplate = Exclude<TemplateFamily, GeneratedTemplate>;

export type LocalContentManifestRecord = {
  route: string;
  template: LocalTemplate;
  localInput: string;
  contentHash: string;
};

export type GeneratedContentManifestRecord = {
  route: string;
  template: GeneratedTemplate;
  localInput: null;
  contentHash: null;
};

export type ContentManifestRecord = LocalContentManifestRecord | GeneratedContentManifestRecord;

export type ContentManifest = {
  schemaVersion: 1;
  content: readonly ContentManifestRecord[];
};

export type PageLink = { label: string; href: string };

export type PageSection = {
  body: string;
  imageAssetId?: string;
  imageAlt?: string;
  links?: readonly PageLink[];
};

export type RawPageRecord = {
  route: string;
  title: string;
  description: string;
  heading: string;
  body: readonly string[];
  heroImage: string | null;
  heroAlt: string | null;
  links: readonly PageLink[];
};

const rawPageKeys = ['route', 'title', 'description', 'heading', 'body', 'heroImage', 'heroAlt', 'links'];
const summerLinkCounts = [0, 0, 0, 0, 1, 2, 2, 1, 3, 1, 3, 1, 0, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0, 0] as const;
const summerMediaCounts = [0, 0, 0, 0, 1, 1, 1, 2, 1, 1, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0] as const;

function asRawPageRecord(input: unknown, route: string): RawPageRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error(`page input must be an object: ${route}`);
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== rawPageKeys.length || !rawPageKeys.every((key) => Object.hasOwn(value, key))) throw new Error(`page input must use exact schema: ${route}`);
  if (value.route !== route || ![value.title, value.description, value.heading].every((field) => typeof field === 'string' && field.trim())) throw new Error(`page input route or text is invalid: ${route}`);
  /* A body paragraph holding a single non-breaking space is a source spacer
     block; every other paragraph must carry copy. */
  if (!Array.isArray(value.body) || value.body.length === 0 || value.body.some((body) => typeof body !== 'string' || (body !== '\u00a0' && !body.trim()))) throw new Error(`page input body is invalid: ${route}`);
  if (value.heroImage !== null && (typeof value.heroImage !== 'string' || !value.heroImage.startsWith('/assets/'))) throw new Error(`page input heroImage is invalid: ${route}`);
  if (value.heroAlt !== null && typeof value.heroAlt !== 'string') throw new Error(`page input heroAlt is invalid: ${route}`);
  if (!Array.isArray(value.links) || value.links.some((link) => typeof link !== 'object' || link === null || Array.isArray(link) || Object.keys(link).length !== 2 || typeof (link as PageLink).label !== 'string' || typeof (link as PageLink).href !== 'string' || !(link as PageLink).href)) throw new Error(`page input links are invalid: ${route}`);
  return value as unknown as RawPageRecord;
}

export function loadPageSections(input: unknown, route: string): PageSection[] {
  const page = asRawPageRecord(input, route);
  const linkCounts = route === '/summer-edition-2025' ? summerLinkCounts : page.body.map((_, index) => index === page.body.length - 1 ? page.links.length : 0);
  const mediaCounts = route === '/summer-edition-2025' ? summerMediaCounts : page.body.map((_, index) => index === 0 && page.heroImage ? 1 : 0);
  if (linkCounts.length !== page.body.length || mediaCounts.length !== page.body.length || linkCounts.reduce((total, count) => total + count, 0) !== page.links.length) throw new Error(`page input section mapping is invalid: ${route}`);

  let linkOffset = 0;
  let mediaOffset = 0;
  return page.body.map((body, index) => {
    const links = linkCounts[index] ? page.links.slice(linkOffset, linkOffset += linkCounts[index]) : undefined;
    const imageAssetId = mediaCounts[index]
      ? route === '/summer-edition-2025'
        ? `asset-images-summer-edition-2025-${String(3 + mediaOffset++).padStart(2, '0')}`
        : page.heroImage
          ? `asset-images-${page.heroImage.split('/').pop()?.replace(/\.[^.]+$/, '').replaceAll(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`
          : undefined
      : undefined;
    if (mediaCounts[index] > 1) mediaOffset += mediaCounts[index] - 1;
    return {
      body,
      ...(imageAssetId ? { imageAssetId, imageAlt: '' } : {}),
      ...(links ? { links } : {})
    };
  });
}

const recordKeys = ['route', 'template', 'localInput', 'contentHash'];
const localInputPattern = /^src\/content\/(?:impact|news|events|snapshots|pages\/(?:institutional|legal|reports|contact-media-donation))\/[a-z0-9][a-z0-9-]*\.(?:md|json)$/;

export function validateContentManifest(manifest: unknown): string[] {
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) return ['content manifest must be an object'];
  const envelope = manifest as Record<string, unknown>;
  if (Object.keys(envelope).length !== 2 || envelope.schemaVersion !== 1 || !Array.isArray(envelope.content)) return ['content manifest must have schemaVersion 1 and content'];

  const errors: string[] = [];
  const routes = new Set<string>();
  for (const [index, value] of envelope.content.entries()) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) { errors.push(`content[${index}] must be an object`); continue; }
    const record = value as Record<string, unknown>;
    if (Object.keys(record).length !== recordKeys.length || !recordKeys.every((key) => Object.hasOwn(record, key))) { errors.push(`content[${index}] must have only contract fields`); continue; }
    if (typeof record.route !== 'string' || !record.route.startsWith('/')) errors.push(`content[${index}] needs a route`);
    if (typeof record.route === 'string' && routes.has(record.route)) errors.push(`content manifest has duplicate route: ${record.route}`);
    if (typeof record.route === 'string') routes.add(record.route);
    if (typeof record.template !== 'string' || !['homepage', 'impact-listing', 'impact-article', 'news-listing', 'news-article', 'event-programme', 'annual-report-document', 'fellows-news-snapshot', 'archive', 'institutional', 'contact-media-donation', 'legal', 'not-found'].includes(record.template)) errors.push(`content[${index}] needs a valid template`);
    const generated = ['homepage', 'impact-listing', 'news-listing', 'archive', 'not-found'].includes(record.template as string);
    if (generated && (record.localInput !== null || record.contentHash !== null)) errors.push(`content[${index}] generated templates must not have local content`);
    if (!generated && (typeof record.localInput !== 'string' || !localInputPattern.test(record.localInput))) errors.push(`content[${index}] needs an approved localInput`);
    if (!generated && (typeof record.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(record.contentHash))) errors.push(`content[${index}] needs a 64-character lowercase SHA-256 contentHash`);
  }
  return errors;
}

export function loadPageData(
  route: string,
  expectedTemplate: TemplateFamily,
  manifest: ContentManifest,
  routeManifest: RouteManifest
): LocalContentManifestRecord {
  const routeRecords = routeManifest?.routes?.filter(
    (record): record is IncludedRouteRecord => record.path === route && record.kind === 'included'
  ) ?? [];
  if (routeRecords.length !== 1) throw new Error(`route is not included exactly once: ${route}`);
  const [routeRecord] = routeRecords;
  if (routeRecord.family !== expectedTemplate) throw new Error(`requested template does not match route manifest: ${route}`);

  const errors = validateContentManifest(manifest);
  if (errors.length) throw new Error(errors.join('; '));
  const records = manifest.content.filter((record) => record.route === route);
  if (records.length === 0) throw new Error(`missing content manifest record: ${route}`);
  if (records.length > 1) throw new Error(`content manifest has duplicate route: ${route}`);
  const [record] = records;
  if (record.template !== routeRecord.family) throw new Error(`content template does not match route manifest: ${route}`);
  if (record.localInput === null) throw new Error(`route does not have a typed local input: ${route}`);
  return record;
}
