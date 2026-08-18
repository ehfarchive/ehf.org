import { expect, test } from 'vitest';
import routeManifest from '../../source-evidence/route-manifest.json';
import { loadRouteManifest } from '../../src/lib/route-manifest';
import type { IncludedRouteRecord, RedirectRouteRecord, RouteManifest } from '../../src/lib/route-manifest';

const FELLOWS_NEWS_SNAPSHOTS = Array.from({ length: 31 }, (_, index) => ({
  path: `/snapshot-${String(index + 1).padStart(2, '0')}`,
  kind: 'included' as const,
  family: 'fellows-news-snapshot' as const,
  sourceUrl: `https://www.ehf.org/snapshot-${String(index + 1).padStart(2, '0')}`,
  sourcePath: `/snapshot-${String(index + 1).padStart(2, '0')}`
}));

const includedRoutes = [
  { path: '/', kind: 'included' as const, family: 'homepage' as const },
  { path: '/read', kind: 'included' as const, family: 'impact-listing' as const },
  { path: '/impact-in-action', kind: 'included' as const, family: 'impact-landing' as const },
  { path: '/watch', kind: 'included' as const, family: 'watch-listing' as const },
  { path: '/watch/video', kind: 'included' as const, family: 'watch-article' as const },
  { path: '/404', kind: 'included' as const, family: 'not-found' as const },
  { path: '/23-annual-report', kind: 'included' as const, family: 'annual-report-document' as const },
  { path: '/read/how-chemergy-is-changing-the-game-in-waste-to-energy', kind: 'included' as const, family: 'impact-article' as const }
];

function validManifest(): RouteManifest {
  return {
    schemaVersion: 1,
    routes: [
      ...includedRoutes,
      { path: '/archive', kind: 'included' as const, family: 'archive' as const, sourceUrl: 'https://www.ehf.org/archive', sourcePath: '/archive' },
      { path: '/homepage', kind: 'redirect' as const, status: 301 as const, redirectType: 'legacy-alias' as const, target: '/' },
      ...FELLOWS_NEWS_SNAPSHOTS
    ].sort((left, right) => left.path.localeCompare(right.path))
  };
}

test('loads a complete normalized manifest with approved permanent redirects', () => {
  const manifest = loadRouteManifest(validManifest());

  expect(manifest.routes).toHaveLength(41);
  expect(manifest.routes.filter((route) => route.kind === 'redirect')).toEqual([
    expect.objectContaining({ path: '/homepage', target: '/' })
  ]);
  expect(manifest.routes.filter((route) => route.kind === 'included' && route.family === 'fellows-news-snapshot')).toHaveLength(31);
});

test('rejects a redirect to a route that is not included', () => {
  const manifest = validManifest();

  const redirect = manifest.routes.find(
    (route): route is RedirectRouteRecord => route.path === '/homepage' && route.kind === 'redirect'
  );
  if (!redirect) throw new Error('expected /homepage redirect fixture');
  redirect.target = '/missing';

  expect(() => loadRouteManifest(manifest)).toThrow('must target an included route');
});
test('loads the checked-in route inventory without unclassified sitemap candidates', () => {
  const manifest = loadRouteManifest(routeManifest, {
    candidates: routeManifest.routes.filter((route) => route.path !== '/').map((route) => route.path)
  });

  expect(manifest.routes).toHaveLength(281);
});

test('classifies the current Impact and Watch surfaces as included routes', () => {
  const manifest = loadRouteManifest(routeManifest);

  expect(manifest.routes.find((route) => route.path === '/impact-in-action')).toMatchObject({
    kind: 'included',
    family: 'impact-landing'
  });
  expect(manifest.routes.find((route) => route.path === '/watch')).toMatchObject({
    kind: 'included',
    family: 'watch-listing'
  });
  expect(
    manifest.routes.filter((route) => route.kind === 'included' && route.family === 'watch-article')
  ).toHaveLength(88);
});

test('includes live Fellows Articles and every linked Impact article regardless of slug shape', () => {
  const manifest = loadRouteManifest(routeManifest);

  expect(manifest.routes.find((route) => route.path === '/ehf-fellows-articles')).toMatchObject({
    kind: 'included',
    family: 'fellows-article-listing'
  });
  expect(
    manifest.routes.filter((route) => route.kind === 'included' && route.family === 'fellows-article')
  ).toHaveLength(4);
  expect(manifest.routes.find((route) => route.path === '/read/swe2a87gjavk3i0brqd2buom9z1hec')).toMatchObject({
    kind: 'included',
    family: 'impact-article'
  });
});

test('does not invent static page routes for source query pagination', () => {
  const manifest = loadRouteManifest(routeManifest);
  for (const path of ['/read/page/2', '/read/page/3', '/read/page/4', '/read/page/5', '/news-blog/page/2']) {
    expect(manifest.routes.find((route) => route.path === path)).toMatchObject({ kind: 'excluded' });
  }
});

test('rejects a manifest that omits an inventory candidate', () => {
  const manifest = validManifest();

  expect(() => loadRouteManifest(manifest, { candidates: [...manifest.routes.map((route) => route.path), '/unclassified'] })).toThrow('unclassified candidate');
});

test('rejects a second homepage route family', () => {
  const manifest = validManifest();
  const included = manifest.routes.find(
    (route): route is IncludedRouteRecord => route.path === '/read' && route.kind === 'included'
  );
  if (!included) throw new Error('expected /read included fixture');
  included.family = 'homepage';

  expect(() => loadRouteManifest(manifest)).toThrow('only / may use the homepage family');
});
