import { expect, test } from 'vitest';
import routeManifest from '../../source-evidence/route-manifest.json';
import progressData from '../../progress/routes.json';
import { summarizeRoutes, validateRouteProgress } from '../../progress/progress.mjs';

test('tracks every in-scope route plus the corrected Archive page exactly once', () => {
  const expectedPaths = routeManifest.routes
    .filter((route) => route.kind === 'included')
    .map((route) => route.path)
    .concat('/archive')
    .sort();

  expect(() => validateRouteProgress(progressData.routes)).not.toThrow();
  expect(progressData.routes.map((route) => route.path).sort()).toEqual(expectedPaths);
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

test('initial progress reflects merged work and the unstarted Archive correction', () => {
  expect(summarizeRoutes(progressData.routes)).toEqual({
    total: 142,
    done: 141,
    inProgress: 0,
    notStarted: 1,
    percentDone: 99.3
  });
});
