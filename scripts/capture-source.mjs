import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SOURCE_ORIGIN = 'https://www.ehf.org';
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = resolve(PROJECT_ROOT, 'source-evidence/route-manifest.json');
const CONTRACT_PATH = resolve(PROJECT_ROOT, 'source-evidence/source-contract.json');
const TEMPLATE_FAMILIES = [
  'homepage', 'impact-listing', 'impact-article', 'impact-landing', 'news-listing', 'news-article', 'event-programme',
  'annual-report-document', 'fellows-news-snapshot', 'fellows-article-listing', 'fellows-article', 'archive',
  'institutional', 'contact-media-donation', 'legal', 'not-found', 'watch-listing', 'watch-article'
];
const captureLogs = new WeakMap();

function normalizePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('?') || value.includes('#') || /\s/.test(value)) throw new Error(`Invalid route path: ${String(value)}`);
  const normalized = value === '/' ? value : value.replace(/\/+$/, '');
  if (!normalized || normalized.includes('//')) throw new Error(`Invalid route path: ${value}`);
  return normalized;
}

function assertCapturePath(value, family, state, viewport, extension) {
  const expected = `source-evidence/screenshots/${family}/${state}-${viewport}.${extension}`;
  if (value !== expected) throw new Error(`Capture path must be ${expected}`);
  return resolve(PROJECT_ROOT, value);
}

function readManifest(input) {
  if (!input || input.schemaVersion !== 1 || !Array.isArray(input.routes) || Object.keys(input).length !== 2) throw new Error('Route manifest must be a schemaVersion 1 envelope');
  const included = new Map();
  for (const route of input.routes) {
    if (!route || route.kind !== 'included' || typeof route.path !== 'string' || !TEMPLATE_FAMILIES.includes(route.family)) continue;
    const path = normalizePath(route.path);
    if (path !== route.path || included.has(path)) throw new Error(`Invalid included route: ${route.path}`);
    included.set(path, route.family);
  }
  return included;
}

function readContract(input, included) {
  if (!input || input.schemaVersion !== 1 || !input.capture || !Array.isArray(input.templates) || Object.keys(input).some((key) => !['schemaVersion', 'capture', 'templates', 'ticket7NewsVisualAcceptance', 'ticket10ContactForms'].includes(key))) throw new Error('Source contract must be a schemaVersion 1 envelope');
  const { capture } = input;
  if (capture.reducedMotion !== true || capture.lazyLoadScrollPx !== 600 || !Array.isArray(capture.viewports) || capture.viewports.length !== 2) throw new Error('Source contract capture settings are invalid');
  const viewports = new Map(capture.viewports.map((viewport) => [viewport?.name, viewport]));
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const viewport = viewports.get(name);
    if (!viewport || viewport.width !== width || viewport.height !== height) throw new Error(`Source contract ${name} viewport is invalid`);
  }
  const templates = new Map();
  for (const template of input.templates) {
    if (!template || !TEMPLATE_FAMILIES.includes(template.family) || typeof template.representativePath !== 'string' || !Array.isArray(template.states) || !Array.isArray(template.captures) || !template.measurements || typeof template.measurements !== 'object' || !template.measurements.desktop || !template.measurements.mobile) throw new Error('Invalid source contract template');
    const representativePath = normalizePath(template.representativePath);
    if (included.get(representativePath) !== template.family) throw new Error(`Representative path is not an included ${template.family} route: ${representativePath}`);
    if (templates.has(template.family)) throw new Error(`Duplicate source contract template: ${template.family}`);
    const states = new Map();
    for (const state of template.states) {
      if (!state || typeof state.name !== 'string' || !state.name || typeof state.sourceObserved !== 'boolean' || typeof state.description !== 'string') throw new Error(`Invalid state for ${template.family}`);
      if (states.has(state.name)) throw new Error(`Duplicate ${template.family} state: ${state.name}`);
      states.set(state.name, state);
    }
    if (!states.has('default')) throw new Error(`Source contract ${template.family} requires a default state`);
    if (!template.states.some((state) => state.sourceObserved)) throw new Error(`Source contract ${template.family} requires a source-observed state`);
    const captures = [];
    for (const artifact of template.captures) {
      if (!artifact || !states.has(artifact.state) || !viewports.has(artifact.viewport) || typeof artifact.screenshot !== 'string' || typeof artifact.metadata !== 'string') throw new Error(`Invalid capture for ${template.family}`);
      captures.push({ ...artifact, screenshotPath: assertCapturePath(artifact.screenshot, template.family, artifact.state, artifact.viewport, 'png'), metadataPath: assertCapturePath(artifact.metadata, template.family, artifact.state, artifact.viewport, 'json') });
    }
    for (const state of states.keys()) for (const viewport of viewports.keys()) if (!captures.some((artifact) => artifact.state === state && artifact.viewport === viewport)) throw new Error(`Missing ${template.family} ${state} ${viewport} capture`);
    templates.set(template.family, { ...template, representativePath, captures });
  }
  if (templates.size !== TEMPLATE_FAMILIES.length || TEMPLATE_FAMILIES.some((family) => !templates.has(family))) throw new Error('Source contract must cover every template family');
  return { viewports, templates };
}

async function scrollDeferredMedia(page, increment) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let position = 0; position < height; position += increment) {
    await page.evaluate((top) => scrollTo(0, top), position);
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0), { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => scrollTo(0, 0));
}

function recordCaptureLogs(page) {
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const locationUrl = message.location().url;
    if (message.text().startsWith('Permissions policy violation: compute-pressure') && locationUrl.includes('youtube.com/s/player/')) return;
    consoleErrors.push({ text: message.text(), location: locationUrl ? `${locationUrl}:${message.location().lineNumber}:${message.location().columnNumber}` : null });
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? null;
    if (failure === 'net::ERR_ABORTED' && request.url().startsWith('https://images.squarespace-cdn.com/')) return;
    failedRequests.push({ url: request.url(), failure });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push({ url: response.url(), failure: `HTTP ${response.status()}${response.statusText() ? ` ${response.statusText()}` : ''}` });
  });
  captureLogs.set(page, { consoleErrors, failedRequests });
}

async function applyState(page, state, viewportName) {
  if (state === 'default') return;
  if (state === 'nav-impact-open' || state === 'nav-about-open') {
    const folder = state === 'nav-impact-open' ? 'impact' : 'about';
    if (viewportName === 'desktop') {
      await page.locator(`button.header-nav-folder-title[aria-controls="${folder}"]:visible`).click();
      await page.locator(`#${folder}:visible`).waitFor({ state: 'visible' });
      return;
    }
    await page.locator('button.header-burger-btn:visible').click();
    await page.getByRole('button', { name: 'Close Menu', exact: true }).waitFor({ state: 'visible' });
    await page.locator('.header-menu-nav-item a').filter({ hasText: folder === 'impact' ? 'Impact' : 'About' }).first().click();
    return;
  }
  if (state === 'pagination-older') {
    await page.getByRole('link', { name: 'Older Posts', exact: true }).click();
    await page.waitForLoadState('networkidle');
    return;
  }
  if (state === 'editorial-content') {
    await page.locator('main h2, main h3, main .blog-item').first().scrollIntoViewIfNeeded();
    return;
  }
  if (state === 'form-filled') {
    const controls = page.locator('input:not([type="hidden"]):visible, textarea:visible');
    for (let index = 0; index < await controls.count(); index += 1) {
      const control = controls.nth(index);
      await control.fill((await control.getAttribute('type')) === 'email' ? 'source-capture@example.test' : 'Source capture');
    }
    return;
  }
  throw new Error(`Unsupported source-observed capture state: ${state}`);
}

async function captureArtifact(browser, template, artifact, viewport, lazyLoadScrollPx) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  recordCaptureLogs(page);
  try {
    const sourceUrl = new URL(template.representativePath, SOURCE_ORIGIN).toString();
    await page.goto(sourceUrl, { waitUntil: 'networkidle' });
    await scrollDeferredMedia(page, lazyLoadScrollPx);
    await applyState(page, artifact.state, artifact.viewport);
    await mkdir(dirname(artifact.screenshotPath), { recursive: true });
    await page.screenshot({ path: artifact.screenshotPath, fullPage: artifact.fullPage ?? (artifact.state === 'default') });
    const logs = captureLogs.get(page);
    const imagesNotLoaded = await page.evaluate(() => [...document.images].filter((image) => (!image.complete || image.naturalWidth === 0) && (image.currentSrc || image.src)).map((image) => image.currentSrc || image.src));
    await writeFile(artifact.metadataPath, `${JSON.stringify({ sourceUrl, route: template.representativePath, family: template.family, viewport: { name: artifact.viewport, width: viewport.width, height: viewport.height }, state: artifact.state, capturedAt: new Date().toISOString(), documentHeight: await page.evaluate(() => document.documentElement.scrollHeight), consoleErrors: logs.consoleErrors, failedRequests: logs.failedRequests, imagesNotLoaded }, null, 2)}\n`);
  } finally {
    captureLogs.delete(page);
    await context.close();
  }
}

const [manifestText, contractText] = await Promise.all([readFile(MANIFEST_PATH, 'utf8'), readFile(CONTRACT_PATH, 'utf8')]);
const sourceContract = JSON.parse(contractText);
const included = readManifest(JSON.parse(manifestText));
const contract = readContract(sourceContract, included);
const requestedFamilies = new Set((process.env.EHF_CAPTURE_FAMILIES ?? '').split(',').map((value) => value.trim()).filter(Boolean));
for (const family of requestedFamilies) if (!contract.templates.has(family)) throw new Error(`Unknown requested capture family: ${family}`);
const artifacts = [...contract.templates.values()]
  .filter((template) => requestedFamilies.size === 0 || requestedFamilies.has(template.family))
  .flatMap((template) => template.captures.map((artifact) => ({ template, artifact })));
if (process.argv.includes('--validate')) {
  for (const { template, artifact } of artifacts) {
    await Promise.all([access(artifact.screenshotPath), access(artifact.metadataPath)]);
    const metadata = JSON.parse(await readFile(artifact.metadataPath, 'utf8'));
    if (metadata.family !== template.family || metadata.route !== template.representativePath || metadata.state !== artifact.state || metadata.viewport?.name !== artifact.viewport) throw new Error(`Capture metadata does not match contract: ${artifact.metadataPath}`);
    if (!Array.isArray(metadata.consoleErrors) || !Array.isArray(metadata.failedRequests) || metadata.consoleErrors.length > 0 || metadata.failedRequests.length > 0) throw new Error(`Capture health is not clean: ${artifact.metadataPath}`);
  }
  console.log(`Validated ${artifacts.length} source captures.`);
} else {
  const browser = await chromium.launch();
  try {
    for (const { template, artifact } of artifacts) await captureArtifact(browser, template, artifact, contract.viewports.get(artifact.viewport), sourceContract.capture.lazyLoadScrollPx);
  } finally {
    await browser.close();
  }
}
