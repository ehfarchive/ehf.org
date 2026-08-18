import { expect, test } from 'vitest';
import routeManifest from '../../source-evidence/route-manifest.json';
import progressData from '../../progress/routes.json';
import { REFRESH_INTERVAL_MS, summarizeRoutes, validateRouteProgress } from '../../progress/progress.mjs';

const missingArchivePaths = [
  '/archive',
  '/april-2023',
  '/april-2024',
  '/april-2025',
  '/august-2022',
  '/august-2023',
  '/august-2024',
  '/december-and-january-2024',
  '/december22-january23',
  '/february-2023',
  '/february-2024',
  '/july-2022',
  '/july-2023',
  '/july-2024',
  '/june-2023',
  '/june-2024',
  '/june-2025',
  '/march-2023',
  '/march-2024',
  '/march-2025',
  '/may-2023',
  '/may-2024',
  '/may-2025',
  '/november-2022',
  '/november-2023',
  '/november-2024',
  '/october-2022',
  '/october-2023',
  '/october-2024',
  '/september-2022',
  '/september-2023',
  '/september-2024'
];

test('refreshes route progress once per minute', () => {
  expect(REFRESH_INTERVAL_MS).toBe(60_000);
});

test('tracks every implemented route and every missing live Archive route exactly once', () => {
  const expectedPaths = routeManifest.routes
    .filter((route) => route.kind === 'included')
    .map((route) => route.path)
    .concat(missingArchivePaths)
    .sort();

  expect(() => validateRouteProgress(progressData.routes)).not.toThrow();
  expect(progressData.routes.map((route) => route.path).sort()).toEqual(expectedPaths);
  expect(
    progressData.routes
      .filter((route) => route.status === 'not-started')
      .map((route) => route.path)
      .sort()
  ).toEqual([...missingArchivePaths].sort());
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

test('initial progress reflects merged work and all unstarted Archive routes', () => {
  expect(summarizeRoutes(progressData.routes)).toEqual({
    total: 173,
    done: 141,
    inProgress: 0,
    notStarted: 32,
    percentDone: 81.5
  });
});
