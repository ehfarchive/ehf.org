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

test('Impact articles retain one source-positioned lead asset and local semantic body content', async ({ page }, testInfo) => {
  const representatives = [
    {
      path: '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
      lead: '/assets/images/content/read-how-chemergy-is-changing-the-game-in-waste-to-energy-1.webp'
    },
    {
      path: '/read/revolutionising-tech-from-nz',
      lead: '/assets/images/content/read-revolutionising-tech-from-nz-1.webp'
    },
    {
      path: '/read/shifting-the-equity-conversation-from-aspiration-to-action',
      lead: '/assets/images/content/read-shifting-the-equity-conversation-from-aspiration-to-action-1.webp'
    },
    {
      path: '/read/scaling-kiwi-healthcare-business-at-home-and-going-global',
      lead: '/assets/images/content/read-scaling-kiwi-healthcare-business-at-home-and-going-global-1.webp'
    }
  ] as const;

  for (const representative of representatives) {
    const response = await page.goto(representative.path);
    expect(response?.ok(), representative.path).toBe(true);
    const article = page.getByRole('article');
    const firstFigure = article.locator('.article-page__body figure').first();

    await expect(article.locator('.article-page__hero')).toHaveCount(0);
    await expect(article.locator('time')).toHaveCount(0);
    await expect(firstFigure.locator('img')).toHaveAttribute('src', representative.lead);
    await expect(article.locator(`img[src="${representative.lead}"]`)).toHaveCount(1);
  }

  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  const chemergyFigure = page.locator('.article-page__body figure[data-archived-align="right"]');
  await expect(chemergyFigure).toHaveCount(1);
  const chemergyGeometry = await chemergyFigure.evaluate((figure) => {
    const image = figure.querySelector('img')!;
    const body = figure.parentElement!;
    const figureBox = figure.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    return {
      bodyWidth: bodyBox.width,
      figureWidth: figureBox.width,
      figureRight: figureBox.right,
      bodyRight: bodyBox.right,
      imageWidth: image.getBoundingClientRect().width,
      position: getComputedStyle(figure).float
    };
  });
  if (testInfo.project.name === 'desktop') {
    expect(chemergyGeometry.position).toBe('right');
    expect(chemergyGeometry.figureWidth / chemergyGeometry.bodyWidth).toBeCloseTo(0.4, 1);
    expect(chemergyGeometry.figureRight).toBeLessThanOrEqual(chemergyGeometry.bodyRight);
  } else {
    expect(chemergyGeometry.position).toBe('none');
    expect(chemergyGeometry.figureWidth).toBeCloseTo(chemergyGeometry.bodyWidth, 1);
  }
  expect(chemergyGeometry.imageWidth).toBeCloseTo(chemergyGeometry.figureWidth, 1);
});

test('Impact listing cards contain only their source image and title', async ({ page }) => {
  for (const path of ['/read', '/read/page/2']) {
    await page.goto(path);
    const cards = page.locator('[data-read-card]');
    await expect(cards).not.toHaveCount(0);
    await expect(cards.locator('time, p')).toHaveCount(0);
    expect(await cards.locator('a.post-card__image').count()).toBeGreaterThan(0);
    await expect(cards.locator('h2 a')).toHaveCount(await cards.count());
  }
});

test('canonical Chemergy article keeps semantic source figures and article navigation', async ({ page }) => {
  const response = await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.locator('.article-page__body figure')).toHaveCount(5);
  await expect(page.locator('.article-page__body figcaption')).toHaveCount(4);
  await expect(page.locator('.article-page__body blockquote')).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: 'Article navigation' }).getByRole('link')).toHaveCount(1);
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