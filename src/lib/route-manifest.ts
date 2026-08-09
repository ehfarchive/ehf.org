export const ROUTE_KINDS = ['included', 'redirect', 'external', 'excluded'] as const;
export const TEMPLATE_FAMILIES = [
  'homepage',
  'impact-listing',
  'impact-article',
  'news-listing',
  'news-article',
  'event-programme',
  'annual-report-document',
  'institutional',
  'contact-media-donation',
  'legal',
  'not-found'
] as const;
export const SPIKE_ROUTES = [
  '/',
  '/read',
  '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
  '/23-annual-report'
] as const;

export type RouteKind = (typeof ROUTE_KINDS)[number];
export type TemplateFamily = (typeof TEMPLATE_FAMILIES)[number];

export type IncludedRouteRecord = {
  path: string;
  kind: 'included';
  family: TemplateFamily;
  sourceUrl?: string;
  sourcePath?: string;
};
export type RedirectRouteRecord = {
  path: string;
  kind: 'redirect';
  target: string;
  status: 301;
  redirectType: 'legacy-alias' | 'monthly-archive';
};
export type ExternalRouteRecord = { path: string; kind: 'external'; target: string };
export type ExcludedRouteRecord = { path: string; kind: 'excluded'; reason: string };
export type RouteRecord = IncludedRouteRecord | RedirectRouteRecord | ExternalRouteRecord | ExcludedRouteRecord;
export type RouteManifest = { schemaVersion: 1; routes: RouteRecord[] };
export type CaptureViewport = { name: 'desktop' | 'mobile'; width: number; height: number };
export type SourceCaptureState = { name: string; sourceObserved: boolean; description: string };
export type SourceMeasurement = string | number | boolean | null | SourceMeasurement[] | { [key: string]: SourceMeasurement };
export type SourceCaptureArtifact = {
  state: string;
  viewport: CaptureViewport['name'];
  screenshot: string;
  metadata: string;
  screenshotWidthPx?: number;
  screenshotHeightPx?: number;
  fullPage?: boolean;
  httpStatus?: number;
  finalUrl?: string;
  interaction?: SourceMeasurement;
  browserHealth?: {
    reducedMotion: boolean;
    fontsReady: boolean;
    consoleErrors: unknown[];
    failedRequests: unknown[];
    unloadedImages: unknown[];
  };
};
export type SourceContractTemplate = {
  family: TemplateFamily;
  representativePath: string;
  states: SourceCaptureState[];
  measurements: { desktop: SourceMeasurement; mobile: SourceMeasurement };
  captures: SourceCaptureArtifact[];
};
export type SourceContract = {
  schemaVersion: 1;
  capture: { viewports: CaptureViewport[]; reducedMotion: true; lazyLoadScrollPx: 600 };
  templates: SourceContractTemplate[];
};


export function normalizeRoutePath(value: string): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('?') || value.includes('#') || /\s/.test(value)) {
    throw new Error(`invalid route path: ${String(value)}`);
  }
  const normalized = value === '/' ? value : value.replace(/\/+$/, '');
  if (!normalized || normalized.includes('//')) throw new Error(`invalid route path: ${value}`);
  return normalized;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactKeys(record: Record<string, unknown>, allowed: string[]) {
  const unexpected = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) throw new Error(`unsupported route record fields: ${unexpected.join(', ')}`);
}

function readRouteRecord(value: unknown): RouteRecord {
  if (!isObject(value) || typeof value.path !== 'string' || typeof value.kind !== 'string') throw new Error('invalid route record');
  const path = normalizeRoutePath(value.path);

  if (value.kind === 'included') {
    assertExactKeys(value, ['path', 'kind', 'family', 'sourceUrl', 'sourcePath']);
    if (!TEMPLATE_FAMILIES.includes(value.family as TemplateFamily)) throw new Error(`invalid template family for ${path}`);
    if (value.sourceUrl !== undefined && typeof value.sourceUrl !== 'string') throw new Error(`invalid sourceUrl for ${path}`);
    if (value.sourcePath !== undefined && typeof value.sourcePath !== 'string') throw new Error(`invalid sourcePath for ${path}`);
    return { path, kind: 'included', family: value.family as TemplateFamily, ...(value.sourceUrl ? { sourceUrl: value.sourceUrl } : {}), ...(value.sourcePath ? { sourcePath: value.sourcePath } : {}) };
  }
  if (value.kind === 'redirect') {
    assertExactKeys(value, ['path', 'kind', 'target', 'status', 'redirectType']);
    if (typeof value.target !== 'string' || value.status !== 301 || !['legacy-alias', 'monthly-archive'].includes(value.redirectType as string)) throw new Error(`invalid redirect for ${path}`);
    return { path, kind: 'redirect', target: normalizeRoutePath(value.target), status: 301, redirectType: value.redirectType as RedirectRouteRecord['redirectType'] };
  }
  if (value.kind === 'external') {
    assertExactKeys(value, ['path', 'kind', 'target']);
    if (typeof value.target !== 'string' || !/^https:\/\//.test(value.target)) throw new Error(`invalid external target for ${path}`);
    return { path, kind: 'external', target: value.target };
  }
  if (value.kind === 'excluded') {
    assertExactKeys(value, ['path', 'kind', 'reason']);
    if (typeof value.reason !== 'string' || !value.reason.trim()) throw new Error(`invalid exclusion reason for ${path}`);
    return { path, kind: 'excluded', reason: value.reason };
  }
  throw new Error(`invalid route kind for ${path}`);
}

export function loadRouteManifest(input: unknown, options: { candidates?: readonly string[] } = {}): RouteManifest {
  if (!isObject(input) || input.schemaVersion !== 1 || !Array.isArray(input.routes) || Object.keys(input).some((key) => !['schemaVersion', 'routes'].includes(key))) {
    throw new Error('route manifest must be a schemaVersion 1 envelope');
  }

  const routes = input.routes.map(readRouteRecord);
  if (routes.some((route, index) => index > 0 && routes[index - 1].path.localeCompare(route.path) > 0)) throw new Error('route manifest records must be sorted by path');
  const paths = new Set<string>();
  for (const route of routes) {
    if (paths.has(route.path)) throw new Error(`duplicate normalized path: ${route.path}`);
    paths.add(route.path);
  }

  const homepages = routes.filter((route): route is IncludedRouteRecord => route.kind === 'included' && route.family === 'homepage');
  if (homepages.length !== 1 || homepages[0].path !== '/') throw new Error('only / may use the homepage family');
  if (routes.some((route) => route.kind === 'included' && route.path === '/' && route.family !== 'homepage')) throw new Error('/ must use the homepage family');

  const includedPaths = new Set(routes.filter((route): route is IncludedRouteRecord => route.kind === 'included').map((route) => route.path));
  for (const route of routes) {
    if (route.kind === 'redirect' && !includedPaths.has(route.target)) throw new Error(`redirect ${route.path} must target an included route`);
  }

  const aliases = routes.filter((route): route is RedirectRouteRecord => route.kind === 'redirect' && route.redirectType === 'legacy-alias');
  const approvedAliases: Record<string, string> = {
    '/homepage': '/',
    '/impact-in-action': '/read',
    '/archive': '/read'
  };
  if (aliases.length !== Object.keys(approvedAliases).length || aliases.some((route) => approvedAliases[route.path] !== route.target)) throw new Error('legacy aliases must be exactly /homepage, /impact-in-action, and /archive');
  const monthly = routes.filter((route): route is RedirectRouteRecord => route.kind === 'redirect' && route.redirectType === 'monthly-archive');
  if (monthly.length !== 31) throw new Error('manifest must contain exactly 31 monthly archive redirects');

  for (const route of SPIKE_ROUTES) if (!includedPaths.has(route)) throw new Error(`missing retained spike route: ${route}`);
  if (options.candidates) {
    const candidates = new Set(options.candidates.map(normalizeRoutePath));
    for (const candidate of candidates) if (!paths.has(candidate)) throw new Error(`unclassified candidate: ${candidate}`);
  }
  return { schemaVersion: 1, routes };
}
