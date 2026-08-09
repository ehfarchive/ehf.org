import { expect, test, type ConsoleMessage, type Page, type Request, type Response } from '@playwright/test';
import assetManifest from '../../source-evidence/asset-manifest.json';
import sourceContract from '../../source-evidence/source-contract.json';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';



export type ComparableState = 'default' | 'nav-about-open' | 'nav-impact-open';

type DecodedPng = {
  bytes: Buffer;
  pixels: Buffer;
  byteSha256: string;
  decodedSha256: string;
  format: string | undefined;
  widthPx: number;
  heightPx: number;
  channels: number;
};

type ScreenshotCaptureMetadata = {
  fullPage: boolean;
  animations: 'disabled';
  type: 'png';
  scale: 'css';
  reducedMotion: true;
};

type ScreenshotEvidence = DecodedPng & {
  captureMetadata: ScreenshotCaptureMetadata;
};

export type ComparableCapture = {
  state: ComparableState;
  viewport: { width: number; height: number };
  consoleErrors: string[];
  failedRequests: string[];
  localImages: string[];
  unloadedImages: string[];
  scrollPositions: number[];
  returnedToTop: boolean;
  requestedMobilePanelActive: boolean;
  mobileRootShifted: boolean;
  screenshotEvidence: ScreenshotEvidence;
};

async function prepareComparableDocument(page: Page): Promise<{ scrollPositions: number[]; returnedToTop: boolean }> {
  await page.evaluate(() => document.fonts.ready);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const scrollPositions: number[] = [];
  for (let position = 0; position < height; position += 600) {
    await page.evaluate((top) => scrollTo(0, top), position);
    scrollPositions.push(position);
    await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  return { scrollPositions, returnedToTop: await page.evaluate(() => window.scrollY === 0) };
}

async function decodeAndHashPng(bytes: Buffer): Promise<DecodedPng> {
  const image = sharp(bytes);
  const metadata = await image.metadata();
  const decoded = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    bytes,
    pixels: decoded.data,
    byteSha256: createHash('sha256').update(bytes).digest('hex'),
    decodedSha256: createHash('sha256').update(decoded.data).digest('hex'),
    format: metadata.format,
    widthPx: decoded.info.width,
    heightPx: decoded.info.height,
    channels: decoded.info.channels
  };
}
async function captureScreenshotEvidence(page: Page, state: ComparableState): Promise<ScreenshotEvidence> {
  const screenshotOptions = {
    fullPage: state === 'default',
    animations: 'disabled' as const,
    type: 'png' as const,
    scale: 'css' as const
  };
  const captureMetadata: ScreenshotCaptureMetadata = {
    ...screenshotOptions,
    reducedMotion: true
  };
  return { ...await decodeAndHashPng(await page.screenshot(screenshotOptions)), captureMetadata };
}

export async function captureComparable(page: Page, route: string, viewport: { width: number; height: number }, state: ComparableState): Promise<ComparableCapture> {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  const onRequestFailed = (request: Request) => failedRequests.push(request.url());
  const onResponse = (response: Response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  };
  page.on('console', onConsole);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);

  try {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route, { waitUntil: 'networkidle' });
    const { scrollPositions, returnedToTop } = await prepareComparableDocument(page);

    let requestedMobilePanelActive = false;
    let mobileRootShifted = false;
    const desktop = (page.viewportSize()?.width ?? 0) >= 768;
    if (state !== 'default') {
      const name = state === 'nav-about-open' ? 'About' : 'Impact';
      if (desktop) {
        await page.getByRole('button', { name, exact: true }).hover();
        await expect(page.getByRole('navigation', { name: new RegExp(`${name} submenu`, 'i') })).toBeVisible();
      } else {
        const dialog = page.getByRole('dialog', { name: /site navigation/i });
        const folder = name.toLowerCase();
        await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        await dialog.getByRole('button', { name, exact: true }).click();
        const panel = dialog.locator(`[data-mobile-folder="${folder}"]`);
        const root = dialog.locator('[data-mobile-root]');
        await expect(panel).toBeVisible();
        await expect(panel).toHaveClass(/is-active/);
        await expect(root).toHaveClass(/is-shifted/);
        requestedMobilePanelActive = (await panel.isVisible()) && await panel.evaluate((element) => element.classList.contains('is-active'));
        mobileRootShifted = await root.evaluate((element) => element.classList.contains('is-shifted'));
      }
    }

    const localImages = await page.locator('img').evaluateAll((images) => (images as HTMLImageElement[]).map((image) => image.currentSrc));
    const unloadedImages = await page.locator('img').evaluateAll((images) => (images as HTMLImageElement[])
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src));
    const screenshotEvidence = await captureScreenshotEvidence(page, state);
    return {
      state,
      viewport: page.viewportSize() ?? { width: 0, height: 0 },
      consoleErrors,
      failedRequests,
      localImages,
      unloadedImages,
      scrollPositions,
      returnedToTop,
      requestedMobilePanelActive,
      mobileRootShifted,
      screenshotEvidence
    };
  } finally {
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }
}

function expectReproducibleCaptures(first: ComparableCapture, second: ComparableCapture, label: string): void {
  expect(first.screenshotEvidence.bytes.equals(second.screenshotEvidence.bytes), `${label}: independently navigated screenshot bytes repeat exactly`).toBe(true);
  expect(first.screenshotEvidence.byteSha256, `${label}: screenshot hashes repeat exactly`).toBe(second.screenshotEvidence.byteSha256);
  expect(first.screenshotEvidence.decodedSha256, `${label}: decoded pixels repeat exactly`).toBe(second.screenshotEvidence.decodedSha256);
  expect(first.screenshotEvidence).toMatchObject({
    format: 'png',
    widthPx: second.screenshotEvidence.widthPx,
    heightPx: second.screenshotEvidence.heightPx,
    channels: second.screenshotEvidence.channels,
    captureMetadata: second.screenshotEvidence.captureMetadata
  });
  expect({
    state: first.state,
    viewport: first.viewport,
    requestedMobilePanelActive: first.requestedMobilePanelActive,
    mobileRootShifted: first.mobileRootShifted,
    screenshotMetadata: first.screenshotEvidence.captureMetadata
  }, `${label}: independently navigated state metadata repeats exactly`).toEqual({
    state: second.state,
    viewport: second.viewport,
    requestedMobilePanelActive: second.requestedMobilePanelActive,
    mobileRootShifted: second.mobileRootShifted,
    screenshotMetadata: second.screenshotEvidence.captureMetadata
  });
}

async function captureIndependentPair(page: Page, route: string, viewport: { width: number; height: number }, state: ComparableState): Promise<[ComparableCapture, ComparableCapture]> {
  const first = await captureComparable(page, route, viewport, state);
  const secondPage = await page.context().newPage();
  try {
    return [first, await captureComparable(secondPage, route, viewport, state)];
  } finally {
    await secondPage.close();
  }
}

test('captureComparable records reproducible full-page screenshot evidence from independent navigations', async ({ page }, testInfo) => {
  const viewport = testInfo.project.name === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 };
  const [first, second] = await captureIndependentPair(page, '/', viewport, 'default');

  expectReproducibleCaptures(first, second, `${testInfo.project.name} default`);
});

test('captureComparable reproduces measured navigation states without runtime faults', async ({ page }, testInfo) => {
  const states: ComparableState[] = ['default', 'nav-about-open', 'nav-impact-open'];
  for (const state of states) {
    const viewport = testInfo.project.name === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 };
    const capture = await captureComparable(page, '/', viewport, state);
    expect(capture.viewport).toEqual(viewport);
    expect(capture.consoleErrors).toEqual([]);
    expect(capture.failedRequests).toEqual([]);
    expect(capture.localImages.every((src) => new URL(src).pathname.startsWith('/assets/'))).toBe(true);
    expect(capture.unloadedImages, 'P0: homepage loads every image before comparable capture completes').toEqual([]);
    expect(capture.scrollPositions[0]).toBe(0);
    expect(capture.returnedToTop).toBe(true);
    if (testInfo.project.name === 'mobile' && state !== 'default') {
      expect(capture.requestedMobilePanelActive).toBe(true);
      expect(capture.mobileRootShifted).toBe(true);
    }
  }
});

test('captureComparable removes its event listeners before reuse', async ({ page }, testInfo) => {
  const viewport = testInfo.project.name === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 };
  const firstCapture = await captureComparable(page, '/', viewport, 'default');
  await page.evaluate(() => console.error('post-capture listener probe'));
  expect(firstCapture.consoleErrors).toEqual([]);
  const secondCapture = await captureComparable(page, '/', viewport, 'nav-about-open');
  await page.evaluate(() => console.error('post-capture listener probe'));
  expect(secondCapture.consoleErrors).toEqual([]);
});
test('measured shared-shell dimensions remain stable', async ({ page }, testInfo) => {
  await page.goto('/');
  const dimensions = await page.evaluate(() => {
    const header = document.querySelector('header')?.getBoundingClientRect().height;
    const footer = document.querySelector('footer')?.getBoundingClientRect().height;
    return { header, footer };
  });
  if (testInfo.project.name === 'desktop') {
    expect(dimensions.header).toBe(123);
    expect(dimensions.footer).toBe(330);
  } else {
    expect(dimensions.header).toBeCloseTo(86.7656, 1);
    expect(dimensions.footer).toBeCloseTo(278.5, 1);
  }
});


type ExcludedRegion = {
  name: 'header-fellow-directory' | 'hero-fellows-directory' | 'footer-fellows-directory';
  x: number;
  y: number;
  width: number;
  height: number;
  reason: string;
};

type HomepageComparisonState = {
  id: string;
  route: '/';
  state: ComparableState;
  viewport: { name: 'desktop' | 'mobile'; width: number; height: number };
  source: { path: string; sha256: string; widthPx: number; heightPx: number };
  excludedRegions: ExcludedRegion[];
  acceptedNormalizedMaskedMae: number;
  ceilingNormalizedMaskedMae: number;
};

type HomepageComparisonContract = {
  version: 1;
  description: string;
  ceilingPolicy: { formula: string; rationale: string };
  states: HomepageComparisonState[];
};

function readHomepageComparisonContract(): HomepageComparisonContract {
  const relativePath = 'source-evidence/contracts/homepage-comparison.json';
  const value: unknown = JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
  if (!value || typeof value !== 'object') throw new Error(`Invalid homepage comparison contract: ${relativePath}`);
  const contract = value as Partial<HomepageComparisonContract>;
  if (contract.version !== 1 || typeof contract.description !== 'string' || !contract.ceilingPolicy
    || contract.ceilingPolicy.formula !== 'acceptedNormalizedMaskedMae * 1.05'
    || typeof contract.ceilingPolicy.rationale !== 'string' || !Array.isArray(contract.states) || contract.states.length !== 6) {
    throw new Error(`Invalid homepage comparison contract: ${relativePath}`);
  }
  const expectedIds: Record<string, true> = {
    'desktop-default': true,
    'desktop-nav-about-open': true,
    'desktop-nav-impact-open': true,
    'mobile-default': true,
    'mobile-nav-about-open': true,
    'mobile-nav-impact-open': true
  };
  const seenIds: Record<string, true> = {};
  for (const state of contract.states) {
    if (!state || typeof state !== 'object' || !expectedIds[state.id] || seenIds[state.id] || state.route !== '/'
      || !['default', 'nav-about-open', 'nav-impact-open'].includes(state.state)
      || !state.viewport || !['desktop', 'mobile'].includes(state.viewport.name)
      || !Number.isInteger(state.viewport.width) || !Number.isInteger(state.viewport.height)
      || !state.source || typeof state.source.path !== 'string' || !/^[a-f0-9]{64}$/.test(state.source.sha256)
      || !Number.isInteger(state.source.widthPx) || !Number.isInteger(state.source.heightPx)
      || !Array.isArray(state.excludedRegions) || !Number.isFinite(state.acceptedNormalizedMaskedMae)
      || !Number.isFinite(state.ceilingNormalizedMaskedMae)
      || Math.abs(state.ceilingNormalizedMaskedMae - (state.acceptedNormalizedMaskedMae * 1.05)) > 1e-12) {
      throw new Error(`Invalid homepage comparison state: ${relativePath}`);
    }
    seenIds[state.id] = true;
    for (const region of state.excludedRegions) {
      if (!region || typeof region !== 'object' || !['header-fellow-directory', 'hero-fellows-directory', 'footer-fellows-directory'].includes(region.name)
        || !Number.isInteger(region.x) || !Number.isInteger(region.y) || !Number.isInteger(region.width) || !Number.isInteger(region.height)
        || region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0
        || region.x + region.width > state.source.widthPx || region.y + region.height > state.source.heightPx
        || typeof region.reason !== 'string' || !region.reason.includes('excluded by the route manifest')) {
        throw new Error(`Invalid homepage comparison mask in ${state.id}: ${relativePath}`);
      }
    }
    const maskedPixels = state.excludedRegions.reduce((total, region) => total + (region.width * region.height), 0);
    if (maskedPixels >= state.source.widthPx * state.source.heightPx) {
      throw new Error(`Homepage comparison masks exclude every pixel in ${state.id}: ${relativePath}`);
    }
  }
  if (Object.keys(seenIds).length !== Object.keys(expectedIds).length) throw new Error(`Homepage comparison states are incomplete: ${relativePath}`);
  return contract as HomepageComparisonContract;
}

function normalizedMaskedMae(source: Pick<DecodedPng, 'pixels' | 'widthPx' | 'heightPx' | 'channels'>, candidate: Pick<DecodedPng, 'pixels' | 'widthPx' | 'heightPx' | 'channels'>, regions: ExcludedRegion[]): number {
  if (source.widthPx !== candidate.widthPx || source.heightPx !== candidate.heightPx || source.channels !== candidate.channels) {
    throw new Error(`Pixel comparison dimensions differ: source ${source.widthPx}x${source.heightPx}x${source.channels}, candidate ${candidate.widthPx}x${candidate.heightPx}x${candidate.channels}`);
  }
  let difference = 0;
  let includedPixels = 0;
  for (let y = 0; y < source.heightPx; y += 1) {
    for (let x = 0; x < source.widthPx; x += 1) {
      if (regions.some((region) => x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height)) continue;
      const offset = ((y * source.widthPx) + x) * source.channels;
      for (let channel = 0; channel < source.channels; channel += 1) difference += Math.abs(source.pixels[offset + channel] - candidate.pixels[offset + channel]);
      includedPixels += 1;
    }
  }
  if (includedPixels === 0) throw new Error('Pixel comparison has no included pixels');
  return difference / (includedPixels * source.channels * 255);
}

function assertMaskedMae(source: DecodedPng, candidate: DecodedPng, state: HomepageComparisonState): number {
  const mae = normalizedMaskedMae(source, candidate, state.excludedRegions);
  expect(mae, `${state.id}: masked normalized MAE ${mae}; accepted ${state.acceptedNormalizedMaskedMae}; ceiling ${state.ceilingNormalizedMaskedMae}`).toBeLessThanOrEqual(state.ceilingNormalizedMaskedMae);
  return mae;
}

test('homepage comparison rejects a material unmasked pixel change', async () => {
  const state = readHomepageComparisonContract().states.find((candidate) => candidate.id === 'desktop-default');
  if (!state) throw new Error('Missing desktop-default comparison state');
  const source = await decodeAndHashPng(readFileSync(resolve(process.cwd(), state.source.path)));
  const altered = { ...source, pixels: Buffer.alloc(source.pixels.length) };
  expect(() => assertMaskedMae(source, altered, state)).toThrow(/masked normalized MAE/);
});

type SourceScreenshotMetadata = {
  family: string;
  route: string;
  state: ComparableState;
  sourceObserved: boolean;
  viewport: { name: 'desktop' | 'mobile'; width: number; height: number };
  capture: { reducedMotion: boolean; fontsReady: boolean; fullPage: boolean; animations: string };
  screenshot: { path: string; widthPx: number; heightPx: number };
  consoleErrors: string[];
  failedRequests: string[];
  imagesNotLoaded: string[];
};

function isSourceScreenshotMetadata(value: unknown): value is SourceScreenshotMetadata {
  if (!value || typeof value !== 'object' || !('family' in value) || !('route' in value) || !('state' in value)
    || !('sourceObserved' in value) || !('viewport' in value) || !('capture' in value) || !('screenshot' in value)
    || !('consoleErrors' in value) || !('failedRequests' in value) || !('imagesNotLoaded' in value)) return false;
  const { viewport, capture, screenshot, consoleErrors, failedRequests, imagesNotLoaded } = value;
  return typeof value.family === 'string' && value.route === '/' && typeof value.state === 'string'
    && typeof value.sourceObserved === 'boolean' && !!viewport && typeof viewport === 'object'
    && 'name' in viewport && typeof viewport.name === 'string' && 'width' in viewport && typeof viewport.width === 'number'
    && 'height' in viewport && typeof viewport.height === 'number' && !!capture && typeof capture === 'object'
    && 'reducedMotion' in capture && typeof capture.reducedMotion === 'boolean' && 'fontsReady' in capture
    && typeof capture.fontsReady === 'boolean' && 'fullPage' in capture && typeof capture.fullPage === 'boolean'
    && 'animations' in capture && typeof capture.animations === 'string' && !!screenshot && typeof screenshot === 'object'
    && 'path' in screenshot && typeof screenshot.path === 'string' && 'widthPx' in screenshot
    && typeof screenshot.widthPx === 'number' && 'heightPx' in screenshot && typeof screenshot.heightPx === 'number'
    && Array.isArray(consoleErrors) && Array.isArray(failedRequests) && Array.isArray(imagesNotLoaded);
}

function readSourceScreenshotMetadata(relativePath: string): SourceScreenshotMetadata {
  const parsed: unknown = JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8'));
  if (!isSourceScreenshotMetadata(parsed)) throw new Error(`Invalid committed homepage source metadata: ${relativePath}`);
  return parsed;
}

function expectWithin(actual: number, expected: number, tolerance: number, label: string): void {
  expect(Math.abs(actual - expected), `${label}: expected ${expected} ± ${tolerance}, received ${actual}`).toBeLessThanOrEqual(tolerance);
}

async function readHomepageVisualMetrics(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };
    const image = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLImageElement)) throw new Error(`Missing ${selector}`);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        width: rect.width,
        height: rect.height,
        currentSrc: new URL(element.currentSrc).pathname,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
        declaredWidth: element.getAttribute('width'),
        declaredHeight: element.getAttribute('height'),
        objectFit: style.objectFit,
        objectPosition: style.objectPosition
      };
    };
    return {
      header: box('header'),
      footer: box('footer'),
      sections: [...document.querySelectorAll<HTMLElement>('[data-homepage-section]')].map((section) => {
        const rect = section.getBoundingClientRect();
        return { id: section.dataset.homepageSection, width: rect.width, height: rect.height };
      }),
      heroImage: image('.home-hero__image'),
      overviewImage: image('.organisation-overview__image'),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth
    };
  });
}

function coverCrop(section: { width: number; height: number }, image: { naturalWidth: number; naturalHeight: number }) {
  const scale = Math.max(section.width / image.naturalWidth, section.height / image.naturalHeight);
  return {
    horizontal: Math.max(0, (image.naturalWidth * scale) - section.width),
    vertical: Math.max(0, (image.naturalHeight * scale) - section.height)
  };
}

test('homepage six-state comparable captures honour committed source evidence and observable contracts', async ({ page }, testInfo) => {
  const viewportName = testInfo.project.name === 'desktop' ? 'desktop' : 'mobile';
  const viewport = viewportName === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 };
  const expectedImagePaths = [
    '/assets/images/home-hero.webp',
    viewportName === 'mobile' ? '/assets/images/home-organisation-mobile.webp' : '/assets/images/home-organisation.webp'
  ];
  const homepageSource = sourceContract.templates.find((template) => template.family === 'homepage');
  const expectedStates: ComparableState[] = ['default', 'nav-about-open', 'nav-impact-open'];
  const comparisonContract = readHomepageComparisonContract();

  expect(homepageSource?.representativePath).toBe('/');
  expect(homepageSource?.states.map((state) => state.name)).toEqual(expectedStates);
  expect(homepageSource?.captures).toHaveLength(6);

  for (const state of expectedStates) {
    const sourceCapture = homepageSource?.captures.find((capture) => capture.state === state && capture.viewport === viewportName);
    expect(sourceCapture, `Missing committed ${viewportName} ${state} source capture`).toBeDefined();
    if (!sourceCapture) throw new Error(`Missing committed ${viewportName} ${state} source capture`);
    const comparison = comparisonContract.states.find((candidate) => candidate.state === state && candidate.viewport.name === viewportName);
    expect(comparison, `Missing ${viewportName} ${state} comparison contract`).toBeDefined();
    if (!comparison) throw new Error(`Missing ${viewportName} ${state} comparison contract`);
    expect(comparison).toMatchObject({
      route: '/',
      viewport,
      source: {
        path: sourceCapture.screenshot,
        widthPx: sourceCapture.screenshotWidthPx,
        heightPx: sourceCapture.screenshotHeightPx
      }
    });

    expect(existsSync(resolve(process.cwd(), comparison.source.path)), `Missing committed source PNG ${comparison.source.path}`).toBe(true);
    expect(existsSync(resolve(process.cwd(), sourceCapture.metadata)), `Missing committed source metadata ${sourceCapture.metadata}`).toBe(true);
    const sourceScreenshot = await decodeAndHashPng(readFileSync(resolve(process.cwd(), comparison.source.path)));
    expect(sourceScreenshot).toMatchObject({
      format: 'png',
      widthPx: comparison.source.widthPx,
      heightPx: comparison.source.heightPx,
      channels: 4
    });
    expect(sourceScreenshot.byteSha256, `${comparison.id}: source PNG hash`).toBe(comparison.source.sha256);

    const metadata = readSourceScreenshotMetadata(sourceCapture.metadata);
    expect(metadata).toMatchObject({
      family: 'homepage',
      route: '/',
      state,
      sourceObserved: true,
      viewport: { name: viewportName, ...viewport },
      capture: { reducedMotion: true, fontsReady: true, animations: 'disabled' },
      screenshot: { path: sourceCapture.screenshot, widthPx: sourceCapture.screenshotWidthPx, heightPx: sourceCapture.screenshotHeightPx },
      consoleErrors: [],
      failedRequests: [],
      imagesNotLoaded: []
    });

    const [capture, reproduction] = await captureIndependentPair(page, '/', viewport, state);
    expect(capture.viewport).toEqual(viewport);
    expect(capture.consoleErrors, `${comparison.id}: no console errors`).toEqual([]);
    expect(capture.failedRequests, `${comparison.id}: no failed requests`).toEqual([]);
    expect(capture.unloadedImages, `${comparison.id}: all images loaded`).toEqual([]);
    expect(capture.returnedToTop, `${comparison.id}: capture returns to top`).toBe(true);
    expect(capture.localImages.map((source) => new URL(source).pathname)).toEqual(expect.arrayContaining(expectedImagePaths));
    expect(capture.localImages.every((source) => new URL(source).origin === new URL(page.url()).origin), `${comparison.id}: no remote images`).toBe(true);
    expectReproducibleCaptures(capture, reproduction, comparison.id);
    const normalizedMae = assertMaskedMae(sourceScreenshot, capture.screenshotEvidence, comparison);
    await testInfo.attach(`${comparison.id}-pixel-comparison.json`, {
      body: Buffer.from(JSON.stringify({
        id: comparison.id,
        sourceSha256: sourceScreenshot.byteSha256,
        sourceDimensions: [sourceScreenshot.widthPx, sourceScreenshot.heightPx, sourceScreenshot.channels],
        candidateSha256: capture.screenshotEvidence.decodedSha256,
        candidateDimensions: [capture.screenshotEvidence.widthPx, capture.screenshotEvidence.heightPx, capture.screenshotEvidence.channels],
        excludedRegions: comparison.excludedRegions,
        normalizedMaskedMae: normalizedMae,
        acceptedNormalizedMaskedMae: comparison.acceptedNormalizedMaskedMae,
        ceilingNormalizedMaskedMae: comparison.ceilingNormalizedMaskedMae
      }, null, 2)),
      contentType: 'application/json'
    });

    const metrics = await readHomepageVisualMetrics(page);
    const sourceMeasurements = homepageSource?.measurements[viewportName];
    expect(sourceMeasurements).toBeDefined();
    if (!sourceMeasurements) throw new Error(`Missing committed ${viewportName} homepage measurements`);
    expect(metrics.reducedMotion, `${viewportName} ${state}: source-captured reduced motion`).toBe(metadata.capture.reducedMotion);
    expect(metrics.horizontalOverflow, `${viewportName} ${state}: no horizontal overflow`).toBeLessThanOrEqual(0);
    expectWithin(metrics.header.height, sourceMeasurements.headerHeightPx, 1, `${viewportName} ${state} header height`);
    expectWithin(metrics.footer.height, sourceMeasurements.footerHeightPx, 2, `${viewportName} ${state} footer height`);
    expect(metrics.sections.map((section) => section.id), `${viewportName} ${state}: public section order`).toEqual(['hero', 'impact-overview']);
    for (const [index, section] of metrics.sections.entries()) {
      const expectedSection = sourceMeasurements.sectionMetrics[index];
      expectWithin(section.width, expectedSection.widthPx, 2, `${viewportName} ${state} ${section.id} width`);
      expectWithin(section.height, expectedSection.heightPx, 3, `${viewportName} ${state} ${section.id} height`);
    }

    expect(metrics.heroImage).toMatchObject({
      currentSrc: '/assets/images/home-hero.webp',
      naturalWidth: 1366,
      naturalHeight: 768,
      declaredWidth: '1366',
      declaredHeight: '768',
      objectFit: 'cover',
      objectPosition: '0% 100%'
    });
    expect(metrics.overviewImage).toMatchObject({
      currentSrc: expectedImagePaths[1],
      naturalWidth: 1440,
      naturalHeight: 2690,
      declaredWidth: '1440',
      declaredHeight: '2690',
      objectFit: 'cover',
      objectPosition: '0% 100%'
    });
    const heroCrop = coverCrop(metrics.sections[0], metrics.heroImage);
    const overviewCrop = coverCrop(metrics.sections[1], metrics.overviewImage);
    expectWithin(heroCrop.horizontal, viewportName === 'desktop' ? 442.3 : 2190.7, 5, `${viewportName} ${state} hero horizontal crop`);
    expectWithin(heroCrop.vertical, 0, 1, `${viewportName} ${state} hero vertical crop`);
    expectWithin(overviewCrop.horizontal, 0, 1, `${viewportName} ${state} overview horizontal crop`);
    expectWithin(overviewCrop.vertical, viewportName === 'desktop' ? 2030 : 15.5, 5, `${viewportName} ${state} overview vertical crop`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Edmund Hillary Fellowship (EHF) 2016 - 2026');
    await expect(page.locator('.home-hero__content > p')).toHaveText([
      'Created to give life to the Global Impact Visa, the Edmund Hillary Fellowship brought entrepreneurs, investors and innovators to Aotearoa New Zealand to find and build solutions to our toughest challenges.',
      'Over a ten-year journey, Edmund Hillary Fellows helped create New Zealand jobs, invested millions into Kiwi businesses, supported regional communities, and developed innovative solutions and technology from our shores, delivering a realised benefit of $111 for every $1 of government funds invested. Many laid down deep roots here, with a commitment to honouring Te Tiriti o Waitangi and the values and legacy of Sir Edmund Hillary.',
      "While the organisation has now closed, the legacy continues through the Fellows and the impact they continue to create. The EHF name and legacy are held by The Hillary Institute, EHF's parent organisation."
    ]);
    await expect(page.locator('.home-hero__stats > p')).toHaveText(['500+ Fellows', '50+ Nationalities', '$111 impact for every $1 invested by Govt']);
    await expect(page.locator('.organisation-overview h2')).toHaveText(['EHF - The Organisation', 'The Fellowship']);
    await expect(page.locator('.organisation-overview p')).toHaveText([
      'As an organisation, EHF was created to attract and welcome entrepreneurs, investors and innovators from around the world who shared a commitment to building meaningful change - with and from Aotearoa - as basecamp for global impact.',
      'What began as a visa programme has evolved into a powerful and impact-focused community. Talented and connected innovators have built deep connections with New Zealand communities, businesses, and innovation ecosystem, creating a positive global impact.'
    ]);
    await expect(page.getByRole('link', { name: /fellow.?directory/i }), 'The excluded Fellow Directory remains deliberately omitted').toHaveCount(0);

    if (state === 'default') {
      if (viewportName === 'mobile') await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeHidden();
    } else {
      const label = state === 'nav-about-open' ? 'About' : 'Impact';
      if (viewportName === 'desktop') {
        await expect(page.getByRole('navigation', { name: new RegExp(`${label} submenu`, 'i') })).toBeVisible();
      } else {
        const dialog = page.getByRole('dialog', { name: /site navigation/i });
        await expect(dialog).toBeVisible();
        await expect(dialog.locator(`[data-mobile-folder="${label.toLowerCase()}"]`)).toHaveClass(/is-active/);
        await expect(dialog.locator('[data-mobile-root]')).toHaveClass(/is-shifted/);
      }
    }
  }

  const missingManifestAssets = expectedImagePaths.filter((localPath) => !assetManifest.assets.some(
    (asset) => asset.classification === 'local' && asset.localPath === localPath && asset.routeUses.includes('/')
  ));
  expect(missingManifestAssets, 'Homepage media is manifest-backed for the canonical route').toEqual([]);
});

test('Impact representative article states render local semantic media without runtime faults', async ({ page }, testInfo) => {
  const representatives = [
    { slug: 'revolutionising-tech-from-nz', minimumFigures: 0 },
    { slug: 'shifting-the-equity-conversation-from-aspiration-to-action', minimumFigures: 0 },
    { slug: 'scaling-kiwi-healthcare-business-at-home-and-going-global', minimumFigures: 9 }
  ] as const;
  const runtimeFaults: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeFaults.push(message.text());
  });
  page.on('pageerror', (error) => runtimeFaults.push(error.message));

  for (const representative of representatives) {
    await page.goto(`/read/${representative.slug}`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-impact-article]')).toBeVisible();
    expect(await page.locator('.article-page__body figure').count()).toBeGreaterThanOrEqual(representative.minimumFigures);
    const mediaPaths = await page.locator('article img').evaluateAll((images) =>
      images.map((image) => new URL(image.getAttribute('src') ?? '', window.location.href).pathname)
    );
    expect(mediaPaths.every((path) => path.startsWith('/assets/'))).toBe(true);
    await testInfo.attach(`${representative.slug}-${testInfo.project.name}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });
  }

  expect(runtimeFaults).toEqual([]);
});
