import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const spikeRoutes = [
  '/',
  '/read',
  '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
  '/23-annual-report'
] as const;

// These source-relative destinations are deliberately retained in the Stage 1 shell,
// but have no spike page. SPIKE-RESULTS.md is the owner-facing record of that scope.
const intentionallyUnavailableDestinations = [
  '/about-ehf',
  '/journey',
  '/our-values',
  '/impact-in-action',
  '/ehf-community-collective',
  '/ehf-fellows-articles',
  '/archive',
  '/fellow-directory-advanced-search',
  '/news',
  '/read/page/2',
  'https://www.ehf.org/fellow-detail?fellow=Melahn-Parker#search=Mela&numRecords=24&minMatchCharLength=2'
] as const;

function collectHealthSignals(page: Page) {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    failedRequests.push(`${request.url()} (${request.failure()?.errorText ?? 'request failed'})`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.url()} (HTTP ${response.status()})`);
  });

  return { consoleErrors, failedRequests };
}

async function waitForLocalMedia(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await expect
    .poll(() => page.locator('img').evaluateAll((images) => images.every((image) => {
      const picture = image as HTMLImageElement;
      return picture.complete && picture.naturalWidth > 0;
    })))
    .toBe(true);
}

function contrastRatio(foreground: string, background: string) {
  const parse = (value: string) => {
    const channels = value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) throw new Error(`Expected an rgb colour, received ${value}`);
    const linear = channels.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  };
  const [lighter, darker] = [parse(foreground), parse(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

for (const route of spikeRoutes) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.ok()).toBe(true);
    await waitForLocalMedia(page);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const blockingViolations = results.violations.filter((violation) =>
      violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(blockingViolations).toEqual([]);
  });

  test(`${route} exposes landmarks and visible keyboard focus`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);

    await page.locator('body').press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveCount(1);
    expect(await focused.evaluate((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return ['A', 'BUTTON'].includes(element.tagName) && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
    })).toBe(true);
  });

  test(`${route} uses safe links and loaded local media without browser failures`, async ({ page }) => {
    const health = collectHealthSignals(page);
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.ok()).toBe(true);
    await waitForLocalMedia(page);

    const inspection = await page.evaluate(() => ({
      links: [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((link) => link.getAttribute('href')),
      images: [...document.images].map((image) => ({ src: image.getAttribute('src'), complete: image.complete, naturalWidth: image.naturalWidth }))
    }));

    for (const href of inspection.links) {
      expect(href).not.toBeNull();
      expect(href).toMatch(/^(\/|https:\/\/|#)/);
    }
    for (const image of inspection.images) {
      expect(image.src).toMatch(/^\/assets\//);
      expect(image.complete).toBe(true);
      expect(image.naturalWidth).toBeGreaterThan(0);
    }
    expect(health.consoleErrors).toEqual([]);
    expect(health.failedRequests).toEqual([]);
  });
}

test('footer keyboard focus uses a high-contrast painted outline', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('.site-footer a').first();
  await link.focus();
  const paint = await link.evaluate((element) => ({
    outline: getComputedStyle(element).outlineColor,
    background: getComputedStyle(element.closest('.site-footer')!).backgroundColor
  }));
  expect(contrastRatio(paint.outline, paint.background)).toBeGreaterThanOrEqual(3);
});

for (const label of ['Impact', 'About'] as const) {
  test(`desktop ${label} dropdown has no serious or critical axe violations with visible focus`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop dropdown contract');
    await page.goto('/');
    const trigger = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
    await trigger.hover();
    const submenu = page.getByRole('navigation', { name: new RegExp(`${label} submenu`, 'i') });
    const link = submenu.getByRole('link').first();
    await link.focus();
    const paint = await link.evaluate((element) => ({
      outline: getComputedStyle(element).outlineColor,
      background: getComputedStyle(element.closest('.desktop-nav__submenu')!).backgroundColor
    }));
    expect(contrastRatio(paint.outline, paint.background)).toBeGreaterThanOrEqual(3);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
  });
}

test('mobile modal has no serious or critical axe violations with visible focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile modal contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /site navigation/i });
  const link = dialog.getByRole('link').first();
  await link.focus();
  const paint = await link.evaluate((element) => ({
    outline: getComputedStyle(element).outlineColor,
    background: getComputedStyle(element.closest('dialog')!).backgroundColor
  }));
  expect(contrastRatio(paint.outline, paint.background)).toBeGreaterThanOrEqual(3);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
});

test('intentionally unavailable source destinations remain explicit and documented', async ({ page }) => {
  await page.goto('/');
  const homeHrefs = await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  await page.goto('/read');
  const readHrefs = await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  const articleHrefs = await page.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  const hrefs = [...new Set([...homeHrefs, ...readHrefs, ...articleHrefs])];

  for (const destination of intentionallyUnavailableDestinations) {
    expect(hrefs).toContain(destination);
  }
});

test('the Chemergy lede retains its exact excluded source profile link', async ({ page }) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  const profile = page.locator('.article-lede').getByRole('link', { name: 'Dr Melahn Parker' });
  await expect(profile).toHaveAttribute(
    'href',
    'https://www.ehf.org/fellow-detail?fellow=Melahn-Parker#search=Mela&numRecords=24&minMatchCharLength=2'
  );
});

test('reduced motion disables shell animation and smooth scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const motion = await page.locator('body').evaluate(() => {
    const probe = document.createElement('div');
    probe.style.transition = 'transform 1s linear';
    document.body.append(probe);
    const transitionDuration = getComputedStyle(probe).transitionDuration;
    const scrollBehavior = getComputedStyle(document.documentElement).scrollBehavior;
    probe.remove();
    return {
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      transitionDuration,
      scrollBehavior
    };
  });
  expect(motion.reduced).toBe(true);
  expect(motion.scrollBehavior).toBe('auto');
  expect(Number.parseFloat(motion.transitionDuration)).toBeLessThanOrEqual(0.01);
});
