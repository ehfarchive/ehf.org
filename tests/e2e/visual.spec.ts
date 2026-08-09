import { expect, test, type ConsoleMessage, type Page, type Request, type Response } from '@playwright/test';
import assetManifest from '../../source-evidence/asset-manifest.json';
import sourceContract from '../../source-evidence/source-contract.json';
import { homepage } from '../../src/data/homepage';



export type ComparableState = 'default' | 'nav-about-open' | 'nav-impact-open';

export type ComparableCapture = {
  state: ComparableState;
  viewport: { width: number; height: number };
  consoleErrors: string[];
  failedRequests: string[];
  localImages: string[];
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
    return {
      state,
      viewport: page.viewportSize() ?? { width: 0, height: 0 },
      consoleErrors,
      failedRequests,
      localImages,
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

test('homepage comparable captures satisfy source visual P0/P1/P2 contracts', async ({ page }, testInfo) => {
  const homepage = sourceContract.templates.find((template) => template.family === 'homepage');
  const viewport = testInfo.project.name === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 };
  const expectedAssetPaths = [
    '/assets/images/home-hero.webp',
    testInfo.project.name === 'mobile' ? '/assets/images/home-organisation-mobile.webp' : '/assets/images/home-organisation.webp'
  ];

  expect(homepage?.representativePath).toBe('/');
  expect(homepage?.states.map((state) => state.name)).toEqual(['default', 'nav-about-open', 'nav-impact-open']);

  const capture = await captureComparable(page, '/', viewport, 'default');
  expect(capture.viewport).toEqual(viewport);
  expect(capture.consoleErrors, 'P0: homepage has no console errors').toEqual([]);
  expect(capture.failedRequests, 'P0: homepage has no failed requests').toEqual([]);
  expect(capture.returnedToTop, 'P2: homepage restores the source capture scroll position').toBe(true);
  expect(capture.localImages.every((src) => new URL(src).origin === new URL(page.url()).origin), 'P1: homepage has no remote images').toBe(true);

  const imagePaths = capture.localImages.map((src) => new URL(src).pathname);
  expect(imagePaths).toEqual(expect.arrayContaining(expectedAssetPaths));
  const missingManifestAssetPaths = expectedAssetPaths.filter(
    (localPath) => !assetManifest.assets.some((asset) => asset.classification === 'local' && asset.localPath === localPath && asset.routeUses.includes('/'))
  );
  expect(missingManifestAssetPaths, 'P1: homepage image paths have manifest-backed asset IDs').toEqual([]);

  await expect(page.locator('[data-homepage-section="hero"]'), 'P2: source-order hero section is present').toBeVisible();
  await expect(page.locator('[data-homepage-section="impact-overview"]'), 'P2: source-order organisation overview is present').toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Edmund Hillary Fellowship (EHF) 2016 - 2026' })).toBeVisible();
  await expect(page.getByRole('link', { name: /fellow.?directory/i }), 'P1: excluded Fellow Directory has no invented replacement').toHaveCount(0);
});

test('homepage copy retains source-observed line breaks', () => {
  expect(homepage.hero.lead).toContain('Aotearoa New Zealand\nto find');
  expect(homepage.hero.paragraphs[0]).toContain('deep roots here, with a\ncommitment');
  expect(homepage.impactOverview.items[0].copy).toContain('around the world\nwho shared');
  expect(homepage.impactOverview.items[1].copy).toContain('connected innovators\nhave built');
});
