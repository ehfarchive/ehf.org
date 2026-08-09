import { expect, test, type ConsoleMessage, type Page, type Request, type Response } from '@playwright/test';
import assetManifest from '../../source-evidence/asset-manifest.json';
import sourceContract from '../../source-evidence/source-contract.json';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';



export type ComparableState = 'default' | 'nav-about-open' | 'nav-impact-open';

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
      mobileRootShifted
    };
  } finally {
    page.off('console', onConsole);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }
}

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

  expect(homepageSource?.representativePath).toBe('/');
  expect(homepageSource?.states.map((state) => state.name)).toEqual(expectedStates);
  expect(homepageSource?.captures).toHaveLength(6);

  for (const state of expectedStates) {
    const sourceCapture = homepageSource?.captures.find((capture) => capture.state === state && capture.viewport === viewportName);
    expect(sourceCapture, `Missing committed ${viewportName} ${state} source capture`).toBeDefined();
    if (!sourceCapture) throw new Error(`Missing committed ${viewportName} ${state} source capture`);

    expect(existsSync(resolve(process.cwd(), sourceCapture.screenshot)), `Missing committed source PNG ${sourceCapture.screenshot}`).toBe(true);
    expect(existsSync(resolve(process.cwd(), sourceCapture.metadata)), `Missing committed source metadata ${sourceCapture.metadata}`).toBe(true);
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

    const capture = await captureComparable(page, '/', viewport, state);
    expect(capture.viewport).toEqual(viewport);
    expect(capture.consoleErrors, `${viewportName} ${state}: no console errors`).toEqual([]);
    expect(capture.failedRequests, `${viewportName} ${state}: no failed requests`).toEqual([]);
    expect(capture.unloadedImages, `${viewportName} ${state}: all images loaded`).toEqual([]);
    expect(capture.returnedToTop, `${viewportName} ${state}: capture returns to top`).toBe(true);
    expect(capture.localImages.map((source) => new URL(source).pathname)).toEqual(expect.arrayContaining(expectedImagePaths));
    expect(capture.localImages.every((source) => new URL(source).origin === new URL(page.url()).origin), `${viewportName} ${state}: no remote images`).toBe(true);

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
