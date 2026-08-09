import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SOURCE_ORIGIN = 'https://www.ehf.org';
const SCROLL_INCREMENT = 600;
const DEFAULT_STATE = 'default';
const DEFERRED_MEDIA_TIMEOUT_MS = 10_000;

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = resolve(PROJECT_ROOT, 'source-evidence/spike-routes.json');
const SCREENSHOT_DIRECTORY = resolve(PROJECT_ROOT, 'source-evidence/screenshots');
const REQUIRED_ROUTES = [
  '/',
  '/read',
  '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
  '/23-annual-report'
];
const REQUIRED_VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 }
};
const HOMEPAGE_STATES = {
  'impact-menu': 'desktop',
  'about-menu': 'desktop',
  'menu-open': 'mobile'
};
const captureLogs = new WeakMap();

function routeKey(route) {
  return route === '/' ? 'home' : route.slice(1).replaceAll('/', '--');
}

function captureStem(route, viewportName, state = DEFAULT_STATE) {
  return `spike--${routeKey(route)}--${viewportName}--${state}`;
}

async function scrollDeferredMedia(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += SCROLL_INCREMENT) {
    await page.evaluate((top) => scrollTo(0, top), y);
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    { timeout: DEFERRED_MEDIA_TIMEOUT_MS }
  ).catch(() => {});
  await page.evaluate(() => scrollTo(0, 0));
}

function sameViewport(actual, expected) {
  return actual?.width === expected.width && actual?.height === expected.height;
}

function assertFixedManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('The source manifest must be an object.');
  }

  if (
    Object.keys(manifest).length !== 2 ||
    !Object.hasOwn(manifest, 'routes') ||
    !Object.hasOwn(manifest, 'viewports') ||
    !Array.isArray(manifest.routes) ||
    JSON.stringify(manifest.routes) !== JSON.stringify(REQUIRED_ROUTES)
  ) {
    throw new Error('The source manifest must contain exactly the four approved routes.');
  }

  const viewportNames = Object.keys(manifest.viewports).sort();
  if (
    viewportNames.length !== 2 ||
    viewportNames[0] !== 'desktop' ||
    viewportNames[1] !== 'mobile' ||
    !sameViewport(manifest.viewports.desktop, REQUIRED_VIEWPORTS.desktop) ||
    !sameViewport(manifest.viewports.mobile, REQUIRED_VIEWPORTS.mobile)
  ) {
    throw new Error('The source manifest must contain only the approved desktop and mobile viewports.');
  }
}

async function readManifest() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  assertFixedManifest(manifest);
  return manifest;
}

function assertManifestRoute(manifest, route) {
  if (!manifest.routes.includes(route)) {
    throw new Error(`Refusing to capture route outside the fixed manifest: ${route}`);
  }
}

function assertViewport(manifest, viewportName) {
  const viewport = manifest.viewports[viewportName];
  if (!viewport) {
    throw new Error(`Refusing to capture viewport outside the fixed manifest: ${viewportName}`);
  }
  return viewport;
}

function screenshotPath(route, viewportName, state) {
  return resolve(SCREENSHOT_DIRECTORY, `${captureStem(route, viewportName, state)}.png`);
}

function metadataPath(route, viewportName, state) {
  return resolve(SCREENSHOT_DIRECTORY, `${captureStem(route, viewportName, state)}.json`);
}

function recordCaptureLogs(page) {
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const location = message.location();
    consoleErrors.push({
      text: message.text(),
      location: location.url
        ? `${location.url}:${location.lineNumber}:${location.columnNumber}`
        : null
    });
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? null
    });
  });

  page.on('response', (response) => {
    if (response.ok()) return;

    const statusText = response.statusText();
    failedRequests.push({
      url: response.url(),
      failure: statusText ? `HTTP ${response.status()} ${statusText}` : `HTTP ${response.status()}`
    });
  });

  captureLogs.set(page, { consoleErrors, failedRequests });
}

async function writeCaptureArtifact(page, route, viewportName, viewport, state) {
  const logs = captureLogs.get(page);
  if (!logs) throw new Error('Capture logs were not registered for this page.');

  const sourceUrl = new URL(route, SOURCE_ORIGIN).toString();
  const capturedAt = new Date().toISOString();
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const imagesNotLoaded = await page.evaluate(() =>
    [...document.images]
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src)
  );

  await page.screenshot({
    path: screenshotPath(route, viewportName, state),
    fullPage: state === DEFAULT_STATE
  });

  await writeFile(
    metadataPath(route, viewportName, state),
    `${JSON.stringify(
      {
        sourceUrl,
        route,
        viewport: { name: viewportName, width: viewport.width, height: viewport.height },
        state,
        capturedAt,
        documentHeight,
        consoleErrors: logs.consoleErrors,
        failedRequests: logs.failedRequests,
        imagesNotLoaded
      },
      null,
      2
    )}\n`
  );
}

async function captureState(page, route, viewportName, state, action) {
  if (
    route !== '/' ||
    !Object.hasOwn(HOMEPAGE_STATES, state) ||
    HOMEPAGE_STATES[state] !== viewportName
  ) {
    throw new Error(`Refusing unsupported homepage capture state: ${route} ${viewportName} ${state}`);
  }

  await action(page);
  await writeCaptureArtifact(page, route, viewportName, assertViewport(activeManifest, viewportName), state);
}

async function openDesktopFolder(page, name, folderId) {
  await page
    .locator(`button.header-nav-folder-title[aria-controls="${folderId}"]:visible`)
    .filter({ hasText: name })
    .click();
  await page.locator(`#${folderId}:visible`).waitFor({ state: 'visible' });
}

async function openMobileMenu(page) {
  await page.locator('button.header-burger-btn:visible').click();
  await page.getByRole('button', { name: 'Close Menu', exact: true }).waitFor({ state: 'visible' });
}

let activeManifest;

async function capture(browser, manifest, route, viewportName, state = DEFAULT_STATE, action) {
  assertManifestRoute(manifest, route);
  const viewport = assertViewport(manifest, viewportName);
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  recordCaptureLogs(page);

  try {
    await page.goto(new URL(route, SOURCE_ORIGIN).toString(), { waitUntil: 'networkidle' });
    await scrollDeferredMedia(page);

    if (state === DEFAULT_STATE) {
      await writeCaptureArtifact(page, route, viewportName, viewport, state);
      return;
    }

    await captureState(page, route, viewportName, state, action);
  } finally {
    captureLogs.delete(page);
    await context.close();
  }
}

async function main() {
  activeManifest = await readManifest();
  await mkdir(SCREENSHOT_DIRECTORY, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const route of activeManifest.routes) {
      for (const viewportName of Object.keys(activeManifest.viewports)) {
        await capture(browser, activeManifest, route, viewportName);
      }
    }

    await capture(
      browser,
      activeManifest,
      '/',
      'desktop',
      'impact-menu',
      (page) => openDesktopFolder(page, 'Impact', 'impact')
    );
    await capture(
      browser,
      activeManifest,
      '/',
      'desktop',
      'about-menu',
      (page) => openDesktopFolder(page, 'About', 'about')
    );
    await capture(browser, activeManifest, '/', 'mobile', 'menu-open', openMobileMenu);
  } finally {
    await browser.close();
  }
}

await main();
