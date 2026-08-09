import type { IncludedRouteRecord, RouteManifest, TemplateFamily } from './route-manifest';

type GeneratedTemplate = Extract<TemplateFamily, 'homepage' | 'impact-listing' | 'news-listing' | 'not-found'>;
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

const recordKeys = ['route', 'template', 'localInput', 'contentHash'];
const localInputPattern = /^src\/content\/(?:impact|news|events|pages\/(?:institutional|legal|reports|contact-media-donation))\/[a-z0-9][a-z0-9-]*\.(?:md|json)$/;

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
    if (typeof record.template !== 'string' || !['homepage', 'impact-listing', 'impact-article', 'news-listing', 'news-article', 'event-programme', 'annual-report-document', 'institutional', 'contact-media-donation', 'legal', 'not-found'].includes(record.template)) errors.push(`content[${index}] needs a valid template`);
    const generated = ['homepage', 'impact-listing', 'news-listing', 'not-found'].includes(record.template as string);
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
