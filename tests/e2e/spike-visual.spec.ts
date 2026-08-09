import { expect, test, type Page } from '@playwright/test';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type ViewportName = 'desktop' | 'mobile';
type CaptureState = 'default' | 'impact-menu' | 'about-menu' | 'menu-open';

type Capture = {
  route: string;
  viewport: { name: ViewportName; width: number; height: number };
  state: CaptureState;
};

type CaptureMetadata = Capture & {
  capturedAt: string;
  documentHeight: number;
  consoleErrors: Array<{ text: string; location: string | null }>;
  failedRequests: Array<{ url: string; failure: string | null }>;
  imagesNotLoaded: string[];
  implementationUrl: string;
};

const projectRoot = process.cwd();
const sourceDirectory = resolve(projectRoot, 'source-evidence/screenshots');
const implementationDirectory = resolve(projectRoot, 'source-evidence/implementation-screenshots');
const implementationOrigin = 'http://127.0.0.1:4321';

test.setTimeout(90_000);

const captures: Capture[] = [
  { route: '/', viewport: { name: 'desktop', width: 1440, height: 1000 }, state: 'default' },
  { route: '/', viewport: { name: 'mobile', width: 390, height: 844 }, state: 'default' },
  { route: '/read', viewport: { name: 'desktop', width: 1440, height: 1000 }, state: 'default' },
  { route: '/read', viewport: { name: 'mobile', width: 390, height: 844 }, state: 'default' },
  {
    route: '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
    viewport: { name: 'desktop', width: 1440, height: 1000 },
    state: 'default'
  },
  {
    route: '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
    viewport: { name: 'mobile', width: 390, height: 844 },
    state: 'default'
  },
  { route: '/23-annual-report', viewport: { name: 'desktop', width: 1440, height: 1000 }, state: 'default' },
  { route: '/23-annual-report', viewport: { name: 'mobile', width: 390, height: 844 }, state: 'default' },
  { route: '/', viewport: { name: 'desktop', width: 1440, height: 1000 }, state: 'impact-menu' },
  { route: '/', viewport: { name: 'desktop', width: 1440, height: 1000 }, state: 'about-menu' },
  { route: '/', viewport: { name: 'mobile', width: 390, height: 844 }, state: 'menu-open' }
];

function routeKey(route: string) {
  return route === '/' ? 'home' : route.slice(1).replaceAll('/', '--');
}

function filename(capture: Capture, extension: 'json' | 'png') {
  return `spike--${routeKey(capture.route)}--${capture.viewport.name}--${capture.state}.${extension}`;
}

async function artifactNames(directory: string, extension: 'json' | 'png') {
  return (await readdir(directory)).filter((name) => name.endsWith(`.${extension}`)).sort();
}

async function waitForVisualReadiness(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    { timeout: 10_000 }
  );
}

async function openState(page: Page, state: CaptureState) {
  if (state === 'impact-menu') {
    const trigger = page.getByRole('button', { name: /^impact$/i });
    await trigger.hover();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: /impact submenu/i })).toBeVisible();
  }

  if (state === 'about-menu') {
    const trigger = page.getByRole('button', { name: /^about$/i });
    await trigger.hover();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeVisible();
  }
  if (state === 'menu-open') {
    const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeVisible();
  }
}

test('visual captures are free of Astro development toolbar chrome', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBe(true);
  await waitForVisualReadiness(page);
  await expect(page.locator('astro-dev-toolbar, astro-dev-toolbar-app, [data-astro-dev-toolbar]')).toHaveCount(0);
  await expect(page.locator('script[src*="@vite/client"], script[src*="@astro/client"]')).toHaveCount(0);
});

test('captures the complete local visual-state baseline', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the desktop project coordinates the fixed visual matrix');

  const plannedJsonNames = captures.map((capture) => filename(capture, 'json')).sort();
  const plannedPngNames = captures.map((capture) => filename(capture, 'png')).sort();

  expect(await artifactNames(sourceDirectory, 'json')).toEqual(plannedJsonNames);
  expect(await artifactNames(sourceDirectory, 'png')).toEqual(plannedPngNames);

  await rm(implementationDirectory, { recursive: true, force: true });
  await mkdir(implementationDirectory, { recursive: true });

  for (const capture of captures) {
    const context = await browser.newContext({ viewport: capture.viewport });
    const page = await context.newPage();
    const consoleErrors: CaptureMetadata['consoleErrors'] = [];
    const failedRequests: CaptureMetadata['failedRequests'] = [];

    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const location = message.location();
      consoleErrors.push({
        text: message.text(),
        location: location.url ? `${location.url}:${location.lineNumber}:${location.columnNumber}` : null
      });
    });
    page.on('requestfailed', (request) => {
      failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? null });
    });
    page.on('response', (response) => {
      if (response.ok()) return;
      const statusText = response.statusText();
      failedRequests.push({
        url: response.url(),
        failure: statusText ? `HTTP ${response.status()} ${statusText}` : `HTTP ${response.status()}`
      });
    });

    try {
      const implementationUrl = new URL(capture.route, implementationOrigin).toString();
      const response = await page.goto(implementationUrl, { waitUntil: 'networkidle' });
      expect(response?.ok()).toBe(true);
      await waitForVisualReadiness(page);
      await openState(page, capture.state);

      const imagesNotLoaded = await page.evaluate(() =>
        [...document.images]
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src)
      );
      expect(imagesNotLoaded).toEqual([]);

      const stem = filename(capture, 'png').replace(/\.png$/, '');
      const metadata: CaptureMetadata = {
        ...capture,
        capturedAt: new Date().toISOString(),
        documentHeight: await page.evaluate(() => document.documentElement.scrollHeight),
        consoleErrors,
        failedRequests,
        imagesNotLoaded,
        implementationUrl
      };

      await page.screenshot({
        path: resolve(implementationDirectory, `${stem}.png`),
        fullPage: capture.state === 'default'
      });
      await writeFile(resolve(implementationDirectory, `${stem}.json`), `${JSON.stringify(metadata, null, 2)}\n`);
    } finally {
      await context.close();
    }
  }

  expect(await artifactNames(implementationDirectory, 'json')).toEqual(await artifactNames(sourceDirectory, 'json'));
  expect(await artifactNames(implementationDirectory, 'png')).toEqual(await artifactNames(sourceDirectory, 'png'));

  for (const name of plannedJsonNames) {
    const metadata = JSON.parse(await readFile(resolve(implementationDirectory, name), 'utf8')) as CaptureMetadata;
    expect(metadata.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(metadata.documentHeight).toBeGreaterThan(0);
    expect(metadata.imagesNotLoaded).toEqual([]);
    expect(metadata.consoleErrors).toEqual([]);
    expect(metadata.failedRequests).toEqual([]);
    expect(metadata.implementationUrl).toMatch(/^http:\/\/127\.0\.0\.1:4321\//);
  }
});
