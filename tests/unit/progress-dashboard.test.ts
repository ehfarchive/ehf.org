import { expect, test } from 'vitest';
import routeManifest from '../../source-evidence/route-manifest.json';
import progressData from '../../progress/routes.json';
import { REFRESH_INTERVAL_MS, summarizeRoutes, validateRouteProgress } from '../../progress/progress.mjs';


test('refreshes route progress once per minute', () => {
  expect(REFRESH_INTERVAL_MS).toBe(60_000);
});

test('tracks every manifest-included route exactly once', () => {
  const expectedPaths = routeManifest.routes
    .filter((route) => route.kind === 'included')
    .map((route) => route.path)
    .sort();

  expect(() => validateRouteProgress(progressData.routes)).not.toThrow();
  expect(progressData.routes.map((route) => route.path).sort()).toEqual(expectedPaths);
  expect(progressData.routes.filter((route) => route.status !== 'done')).toEqual([]);
});

test('summarizes done, in-progress, and not-started routes', () => {
  const summary = summarizeRoutes([
    { path: '/', status: 'done' },
    { path: '/archive', status: 'in-progress' },
    { path: '/future', status: 'not-started' },
    { path: '/another', status: 'done' }
  ]);

  expect(summary).toEqual({
    total: 4,
    done: 2,
    inProgress: 1,
    notStarted: 1,
    percentDone: 50
  });
});

test('derives progress totals from the included route manifest', () => {
  const total = routeManifest.routes.filter((route) => route.kind === 'included').length;
  const done = progressData.routes.filter((route) => route.status === 'done').length;

  expect(summarizeRoutes(progressData.routes)).toEqual({
    total,
    done,
    inProgress: 0,
    notStarted: 0,
    percentDone: Number(((done / total) * 100).toFixed(1))
  });
});
