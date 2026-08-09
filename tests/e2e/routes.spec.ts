import { expect, test } from '@playwright/test';
import routeManifest from '../../source-evidence/route-manifest.json';

const impactArticlePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'impact-article')
  .map((route) => route.path);
const impactListingPaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'impact-listing')
  .map((route) => route.path);

test('homepage exposes the site title and main landmark', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/Edmund Hillary Fellowship/i);
  await expect(page.getByRole('main')).toBeVisible();
});

test('every manifest-declared Impact listing and article path is static', async ({ page }) => {
  expect(impactListingPaths).toEqual(['/read', '/read/page/2', '/read/page/3', '/read/page/4', '/read/page/5']);
  expect(impactArticlePaths).toHaveLength(84);

  for (const path of [...impactListingPaths, ...impactArticlePaths]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
  }
});

test('Impact archive has deterministic source order, accessible manifest-bounded pagination, and no duplicate cards', async ({ page }) => {
  const archivePaths = ['/read', '/read/page/2', '/read/page/3', '/read/page/4', '/read/page/5'];
  const expectedPageSizes = [20, 20, 20, 20, 4];
  const slugs: string[] = [];

  for (const [index, path] of archivePaths.entries()) {
    await page.goto(path);
    const pageSlugs = await page.locator('[data-impact-slug]').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-impact-slug'))
    );
    expect(pageSlugs).toHaveLength(expectedPageSizes[index]);
    slugs.push(...pageSlugs.filter((slug): slug is string => slug !== null));
  }

  expect(slugs.slice(0, 4)).toEqual([
    'how-chemergy-is-changing-the-game-in-waste-to-energy',
    'harnessing-pine-pollens-power-to-transform-wellbeing',
    'globalising-kiwi-innovation',
    'helping-to-solve-the-unsolvable-challenges'
  ]);
  expect(slugs).toHaveLength(84);
  expect(new Set(slugs).size).toBe(84);
  await page.goto('/read');
  await expect(page.locator('[data-impact-page-size="20"]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Impact pagination' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Page 2' })).toHaveAttribute('href', '/read/page/2');
  await expect(page.locator('[data-impact-slug="how-chemergy-is-changing-the-game-in-waste-to-energy"] img')).toHaveAttribute('src', '/assets/images/cards/chemergy.webp');
  await expect(page.locator('[data-impact-slug="how-chemergy-is-changing-the-game-in-waste-to-energy"] img')).toHaveAttribute('alt', '');
});
test('undeclared Impact slugs and pagination pages fail closed', async ({ page }) => {
  for (const path of ['/read/not-a-declared-impact-story', '/read/page/6', '/read/the-awa-river-story-inspiring-connection-action']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test('canonical Chemergy article renders typed metadata, local media, and semantic source body content', async ({ page }) => {
  const response = await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.locator('time[datetime="2025-06-06T00:00:00.000Z"]')).toHaveText(/6 June 2025/);
  await expect(page.locator('.article-page__body figure')).toHaveCount(5);
  await expect(page.locator('.article-page__body figcaption')).toHaveCount(4);
  await expect(page.locator('.article-page__body blockquote')).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: 'Article navigation' }).getByRole('link')).toHaveAttribute('href', '/read/harnessing-pine-pollens-power-to-transform-wellbeing');
  await expect(page.locator('.article-page__body a[href^="/"]')).toHaveCount(0);

  const mediaPaths = await page.locator('article img').evaluateAll((images) =>
    images.map((image) => new URL(image.getAttribute('src') ?? '', window.location.href).pathname)
  );
  expect(mediaPaths).not.toEqual([]);
  expect(mediaPaths.every((path) => path.startsWith('/assets/'))).toBe(true);
});


test('Impact external service references remain safe links rather than embedded runtimes', async ({ page }) => {
  for (const path of [
    '/read/crowdfunding-land-stewardship-in-regional-aotearoa',
    '/read/discovering-founder-kaupapa-outside-the-valley'
  ]) {
    await page.goto(path);
    await expect(page.locator('.article-page__body iframe')).toHaveCount(0);
    const externalService = page.locator('.article-page__body a[href*="cdn.embedly.com"]');
    await expect(externalService).toHaveCount(1);
    await expect(externalService).toHaveAttribute('target', '_blank');
    await expect(externalService).toHaveAttribute('rel', 'noopener noreferrer');
  }
});