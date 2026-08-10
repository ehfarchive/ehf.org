import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assetManifest from '../../source-evidence/asset-manifest.json';
import contentManifest from '../../source-evidence/content-manifest.json';
import routeManifest from '../../source-evidence/route-manifest.json';
import { parseStrictUtcIsoDate } from '../../src/lib/iso-date';

const impactArticlePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'impact-article')
  .map((route) => route.path);
const impactListingPaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'impact-listing')
  .map((route) => route.path);
const newsArticlePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'news-article')
  .map((route) => route.path);
const newsListingPaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'news-listing' && route.path === '/news-blog')
  .map((route) => route.path);
const orderedNews = contentManifest.content
  .filter((record) => record.template === 'news-article' && typeof record.localInput === 'string')
  .map((record) => {
    const input = record.localInput!;
    const body = readFileSync(resolve(process.cwd(), input), 'utf8');
    const publishedAt = /^publishedAt:\s*"([^"]+)"$/m.exec(body)?.[1];
    if (!publishedAt) throw new Error(`News content lacks publishedAt: ${input}`);
    return {
      path: record.route,
      slug: input.slice('src/content/news/'.length, -'.md'.length),
      publishedAt: parseStrictUtcIsoDate(publishedAt, `News content ${input}.publishedAt`)
    };
  })
  .sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime() || left.slug.localeCompare(right.slug));

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

test('Impact article body links follow the route manifest and safe external policy', async ({ page }) => {
  await page.goto('/read/access-to-justice-through-collaborative-action');
  const homeLink = page.locator('.article-page__body a[href="/"]').filter({ hasText: 'ehf.org' });
  await expect(homeLink).toHaveCount(1);

  await page.goto('/read/celebrating-achievements-and-values-this-everest-day');
  const expeditionLink = page.getByRole('article').getByRole('link', { name: 'New Expedition event' });
  await expect(expeditionLink).toHaveAttribute('href', '/news-blog/a-new-expedition-the-mission-studio');

  await page.goto('/read/discovering-founder-kaupapa-outside-the-valley');
  const article = page.getByRole('article');
  await expect(article.getByRole('link', { name: 'Ryan Williams' })).toHaveCount(0);
  await expect(article.locator('.article-page__body')).toContainText('Ryan Williams');
  const churroMedia = article.getByRole('link', { name: 'Churro Media' });
  await expect(churroMedia).toHaveAttribute('href', 'https://www.churromedia.com/');
  await expect(churroMedia).toHaveAttribute('target', '_blank');
  await expect(churroMedia).toHaveAttribute('rel', 'noopener noreferrer');
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

test('News emits exactly the owner-approved listing and 21 declared article routes', async ({ page }) => {
  expect(newsListingPaths).toEqual(['/news-blog']);
  expect(newsArticlePaths).toHaveLength(21);
  expect(newsArticlePaths).toContain('/news-blog/a-year-of-impact-value-and-momentum-2023/24-annual-report');
  expect(orderedNews.map((article) => article.path).sort()).toEqual([...newsArticlePaths].sort());

  for (const path of [...newsListingPaths, ...newsArticlePaths]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
  }
});

test('News listing renders every approved card once in descending publishedAt and ascending slug order without pagination', async ({ page }) => {
  await page.goto('/news-blog');

  const slugs = await page.locator('[data-news-slug]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-news-slug'))
  );
  expect(slugs).toEqual(orderedNews.map((article) => article.slug));
  expect(new Set(slugs).size).toBe(21);
  await expect(page.locator('[data-news-pagination], nav[aria-label*="pagination" i], a[href*="offset="]')).toHaveCount(0);
  await expect(page.getByText(/older posts|newer posts/i)).toHaveCount(0);
});

test('News cards retain the source editorial metadata and responsive geometry', async ({ page }, testInfo) => {
  await page.goto('/news-blog');

  const cards = page.locator('[data-news-card]');
  const cardCount = await cards.count();
  expect(cardCount).toBe(21);
  await expect(cards.locator('time')).toHaveCount(21);
  await expect(cards.getByRole('link', { name: 'Read More' })).toHaveCount(21);

  const metadata = await cards.evaluateAll((elements) => elements.map((card) => {
    const time = card.querySelector('time');
    const readMore = [...card.querySelectorAll('a')].find((link) => link.textContent?.trim() === 'Read More');
    return {
      date: time?.textContent?.trim(),
      dateTime: time?.getAttribute('datetime'),
      readMoreDecoration: readMore ? getComputedStyle(readMore).textDecorationLine : ''
    };
  }));
  expect(metadata).toHaveLength(21);
  expect(metadata.every(({ date, dateTime, readMoreDecoration }) =>
    /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(date ?? '')
    && /^\d{4}-\d{2}-\d{2}$/.test(dateTime ?? '')
    && readMoreDecoration.includes('underline')
  )).toBe(true);

  const geometry = await page.locator('[data-news-listing]').evaluate((listing) => {
    const grid = listing.querySelector<HTMLElement>('.news-grid')!;
    const cards = [...listing.querySelectorAll<HTMLElement>('[data-news-card]')];
    const images = cards.flatMap((card) => [...card.querySelectorAll<HTMLImageElement>('img')]);
    const positions = cards.slice(0, 3).map((card) => {
      const box = card.getBoundingClientRect();
      return { top: box.top, left: box.left, width: box.width };
    });
    const gridStyle = getComputedStyle(grid);
    return {
      columns: gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length,
      columnGap: Number.parseFloat(gridStyle.columnGap),
      positions,
      imageRatios: images.map((image) => {
        const box = image.getBoundingClientRect();
        return box.width / box.height;
      })
    };
  });

  expect(geometry.imageRatios.length).toBeGreaterThan(0);
  expect(geometry.imageRatios.every((ratio) => Math.abs(ratio - (10 / 7)) < 0.03)).toBe(true);
  if (testInfo.project.name === 'desktop') {
    expect(geometry.columns).toBe(2);
    expect(geometry.columnGap).toBeCloseTo(20, 0);
    expect(geometry.positions[0].top).toBeCloseTo(geometry.positions[1].top, 1);
    expect(geometry.positions[2].top).toBeGreaterThan(geometry.positions[0].top);
    expect(geometry.positions[0].width).toBeCloseTo(685, -1);
  } else {
    expect(geometry.columns).toBe(1);
    expect(geometry.positions[1].top).toBeGreaterThan(geometry.positions[0].top);
  }
});

test('News undeclared, Hillary, page, and query variants fail closed without a recreated older listing', async ({ page }) => {
  const excludedHillaryPaths = routeManifest.routes
    .filter((route) => route.kind === 'excluded' && route.path.startsWith('/news-blog/'))
    .map((route) => route.path);

  expect(excludedHillaryPaths).toHaveLength(6);
  for (const path of ['/news', '/news-blog/not-a-declared-story', '/news-blog/page/2', ...excludedHillaryPaths]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }

  const queryResponse = await page.goto('/news-blog?offset=1675630776192');
  expect(queryResponse?.ok()).toBe(true);
  expect(await page.locator('[data-news-slug]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-news-slug'))
  )).toEqual(orderedNews.map((article) => article.slug));
  await expect(page.locator('a[href*="offset="]')).toHaveCount(0);
});

test('News representative preserves its body lead asset without a duplicate hero or external embed runtime', async ({ page }) => {
  const response = await page.goto('/news-blog/announcing-the-new-ceo-for-ehf');
  expect(response?.ok()).toBe(true);

  const article = page.getByRole('article');
  await expect(article.getByRole('heading', { level: 1 })).toHaveText('Announcing the new CEO for EHF');
  await expect(article.locator('.article-page__hero')).toHaveCount(0);
  await expect(article.locator('.article-page__body figure img')).toHaveCount(1);
  await expect(article.locator('iframe')).toHaveCount(0);
  const mediaPaths = await article.locator('img').evaluateAll((images) =>
    images.map((image) => new URL(image.getAttribute('src') ?? '', window.location.href).pathname)
  );
  expect(mediaPaths).toEqual(['/assets/images/content/news-blog-announcing-the-new-ceo-for-ehf-1.webp']);
});

test('News representative editorial image keeps its source desktop measure without changing mobile', async ({ page }, testInfo) => {
  await page.goto('/news-blog/announcing-the-new-ceo-for-ehf');

  const geometry = await page.locator('.article-page__body figure').first().evaluate((figure) => {
    const image = figure.querySelector('img')!;
    const article = figure.closest<HTMLElement>('article')!;
    const imageBox = image.getBoundingClientRect();
    const articleBox = article.getBoundingClientRect();
    return {
      imageWidth: imageBox.width,
      imageCenter: imageBox.left + (imageBox.width / 2),
      articleCenter: articleBox.left + (articleBox.width / 2),
      articleWidth: articleBox.width
    };
  });

  expect(geometry.imageCenter).toBeCloseTo(geometry.articleCenter, 1);
  if (testInfo.project.name === 'desktop') {
    expect(geometry.imageWidth).toBeCloseTo(645, -1);
  } else {
    expect(geometry.imageWidth).toBeCloseTo(geometry.articleWidth, 1);
  }
});

const eventProgrammePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'event-programme')
  .map((route) => route.path);
const annualReportPaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'annual-report-document')
  .map((route) => route.path);

test('Event and report routes are exactly manifest-bounded and use their matching typed inputs', async ({ page }) => {
  expect(eventProgrammePaths).toEqual([
    '/2025-hillary-innovation-summit-breakout-sessions-summary',
    '/2025-summit-programme'
  ]);
  expect(annualReportPaths).toEqual(['/22-annual-report', '/23-annual-report']);

  const expectedInputs: Record<string, string> = {
    '/2025-hillary-innovation-summit-breakout-sessions-summary': 'src/content/events/2025-hillary-innovation-summit-breakout-sessions-summary.md',
    '/2025-summit-programme': 'src/content/events/2025-summit-programme.md',
    '/22-annual-report': 'src/content/pages/reports/22-annual-report.json',
    '/23-annual-report': 'src/content/pages/reports/23-annual-report.json'
  };
  const records = contentManifest.content.filter((record) => Object.hasOwn(expectedInputs, record.route));
  expect(records.map((record) => [record.route, record.localInput])).toEqual(Object.entries(expectedInputs));

  for (const path of [...eventProgrammePaths, ...annualReportPaths]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
    await expect(page.getByRole('main')).toHaveCount(1);
  }

  for (const path of [
    '/events',
    '/events/2025-summit-programme',
    '/annual-reports',
    '/annual-reports/23-annual-report',
    '/24-annual-report'
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test('Annual reports render only their five declared local document controls, separate from prose', async ({ page }) => {
  const controls = [
    {
      route: '/22-annual-report',
      id: 'asset-documents-hillary-institute-ehf-annual-report-2022-pdf',
      href: '/assets/documents/hillary-institute-ehf-annual-report-2022.pdf',
      sha256: '6c443487b0eed8a032890ba760b3ce68ce634ab1cba05bf43c426dfe370702e2'
    },
    {
      route: '/22-annual-report',
      id: 'asset-documents-certified-fs-hillary-institute-and-subsidiary-2022-pdf',
      href: '/assets/documents/certified-fs-hillary-institute-and-subsidiary-2022.pdf',
      sha256: '3d62b3ad366f3325d34e43b8cbc2b7987d67b7a6df5ca52a5a0a46b7ad8d5c63'
    },
    {
      route: '/23-annual-report',
      id: 'asset-documents-ehf-hi-annual-report-2023-pdf',
      href: '/assets/documents/ehf-hi-annual-report-2023.pdf',
      sha256: 'aff78c73d7574fafefc238392c692dfff1803ff5e7bcfed10ae229f5523d9021'
    },
    {
      route: '/23-annual-report',
      id: 'asset-documents-edmund-hillary-fellowship-limited-2023-financial-statements-pdf',
      href: '/assets/documents/edmund-hillary-fellowship-limited-2023-financial-statements.pdf',
      sha256: '68fa767afc8e112fb3617c32f319fa788908472bab9e3fcfc532d5ba762d4109'
    },
    {
      route: '/23-annual-report',
      id: 'asset-documents-the-hillary-institute-subsidiary-entities-2023-financial-statements-pdf',
      href: '/assets/documents/the-hillary-institute-subsidiary-entities-2023-financial-statements.pdf',
      sha256: '83aa88a331e589e463595d9cd6c0d821b97847a82389364f0bdfc3226c7ea8e4'
    }
  ] as const;

  expect(controls).toHaveLength(5);
  for (const control of controls) {
    const asset = assetManifest.assets.find((candidate) => candidate.id === control.id);
    expect(asset).toMatchObject({
      classification: 'local',
      localPath: control.href,
      sha256: control.sha256,
      routeUses: [control.route]
    });
    expect(readFileSync(resolve(process.cwd(), `public${control.href}`))).toBeDefined();

    await page.goto(control.route);
    const link = page.locator(`[data-report-download="${control.id}"]`);
    expect(createHash('sha256').update(readFileSync(resolve(process.cwd(), `public${control.href}`))).digest('hex')).toBe(control.sha256);
    await expect(link).toHaveAttribute('href', control.href);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }

  for (const route of annualReportPaths) {
    await page.goto(route);
    const controlsOnPage = page.locator('[data-report-download]');
    const expectedCount = controls.filter((control) => control.route === route).length;
    await expect(controlsOnPage).toHaveCount(expectedCount);
    await expect(page.locator('[data-report-prose] a')).toHaveCount(0);
    await expect(page.locator('[data-report-download^="asset-documents-"]')).toHaveCount(expectedCount);
  }
});