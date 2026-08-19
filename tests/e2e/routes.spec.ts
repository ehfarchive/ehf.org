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
const watchArticlePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'watch-article')
  .map((route) => route.path);
const fellowsArticlePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'fellows-article')
  .map((route) => route.path);
const newsArticlePaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'news-article')
  .map((route) => route.path);
const newsListingPaths = routeManifest.routes
  .filter((route) => route.kind === 'included' && route.family === 'news-listing')
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

test('site layout exposes the local PNG favicon without a fallback icon request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));

  await page.goto('/');

  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/assets/images/favicon.png');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('type', 'image/png');
  expect(requests).not.toContain('/favicon.ico');
});

test('every manifest-declared Impact listing and article path is static', async ({ page }) => {
  expect(impactListingPaths).toEqual(['/read']);
  expect(impactArticlePaths).toHaveLength(85);

  for (const path of [...impactListingPaths, ...impactArticlePaths]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
  }
});

test('Impact archive preserves source order and query-cursor pagination without duplicate cards', async ({ page }) => {
  const expectedPageSizes = [20, 20, 20, 20, 5];
  const newerHrefs = [
    null,
    '?offset=1714430433447&reversePaginate=true',
    '?offset=1656381994088&reversePaginate=true',
    '?offset=1606367179412&reversePaginate=true',
    '?offset=1593586980878&reversePaginate=true'
  ];
  const olderHrefs = [
    '?offset=1715571924869',
    '?offset=1657161783620',
    '?offset=1607230080206',
    '?offset=1594243440651',
    null
  ];
  const slugs: string[] = [];

  await page.goto('/read');
  for (const [index, expectedPageSize] of expectedPageSizes.entries()) {
    const visibleCards = page.locator('[data-impact-slug]:visible');
    await expect(visibleCards).toHaveCount(expectedPageSize);
    slugs.push(...await visibleCards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('data-impact-slug')).filter((slug): slug is string => slug !== null)
    ));

    const pagination = page.getByRole('navigation', { name: 'Impact pagination' });
    await expect(pagination).toBeVisible();
    const newer = pagination.getByRole('link', { name: 'Newer Posts' });
    const older = pagination.getByRole('link', { name: 'Older Posts' });
    await expect(newer).toHaveCount(newerHrefs[index] === null ? 0 : 1);
    await expect(older).toHaveCount(olderHrefs[index] === null ? 0 : 1);
    if (newerHrefs[index] !== null) await expect(newer).toHaveAttribute('href', newerHrefs[index]);
    if (olderHrefs[index] !== null) await expect(older).toHaveAttribute('href', olderHrefs[index]);
    if (index < expectedPageSizes.length - 1) await older.click();
  }

  expect(slugs.slice(0, 4)).toEqual([
    'how-chemergy-is-changing-the-game-in-waste-to-energy',
    'harnessing-pine-pollens-power-to-transform-wellbeing',
    'globalising-kiwi-innovation',
    'helping-to-solve-the-unsolvable-challenges'
  ]);
  expect(slugs).toHaveLength(85);
  expect(new Set(slugs).size).toBe(85);
  await page.goto('/read');
  await expect(page.locator('[data-impact-page-size="20"]')).toBeVisible();
  await expect(page.locator('[data-impact-slug="how-chemergy-is-changing-the-game-in-waste-to-energy"] img')).toHaveAttribute('src', '/assets/images/cards/chemergy.webp');
  await expect(page.locator('[data-impact-slug="how-chemergy-is-changing-the-game-in-waste-to-energy"] img')).toHaveAttribute('alt', '');
});

test('Impact archive exposes every story without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/read');
    await expect(page.locator('[data-impact-slug]:visible')).toHaveCount(85);
    await expect(page.getByRole('navigation', { name: 'Impact pagination' })).toBeHidden();
  } finally {
    await context.close();
  }
});

test('undeclared Impact slugs and invented pagination pages fail closed', async ({ page }) => {
  for (const path of ['/read/not-a-declared-impact-story', '/read/page/2', '/read/page/6', '/read/the-awa-river-story-inspiring-connection-action']) {
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
  await expect(chemergyFigure).toHaveCount(2);
  expect(await page.locator('[data-impact-article]').evaluate((article) =>
    JSON.parse(article.getAttribute('data-archived-figures') ?? '[]')
  )).toMatchObject([
    { align: 'right', crop: { width: 522.1, height: 413.9, focal: '48.4% 35.2%' } },
    null,
    null,
    { align: 'right', crop: { width: 522.1, height: 259.6, focal: '50% 50%' } }
  ]);
  const chemergyFigureFirst = chemergyFigure.first();
  const chemergyGeometry = await chemergyFigureFirst.evaluate((figure) => {
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
    expect(chemergyGeometry.figureWidth).toBeCloseTo(522.1, 0);
    expect(chemergyGeometry.figureRight).toBeLessThanOrEqual(chemergyGeometry.bodyRight);
  } else {
    expect(chemergyGeometry.position).toBe('none');
    expect(chemergyGeometry.figureWidth).toBeCloseTo(chemergyGeometry.bodyWidth - 17, 1);
  }
  expect(chemergyGeometry.imageWidth).toBeCloseTo(chemergyGeometry.figureWidth, 1);
});

test('Impact listing cards contain only their source image and title', async ({ page }) => {
  for (const path of ['/read', '/read?offset=1715571924869']) {
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

test('News emits exactly the manifest-backed listing and 27 declared article routes', async ({ page }) => {
  expect(newsListingPaths).toEqual(['/news-blog']);
  expect(newsArticlePaths).toHaveLength(27);
  expect(newsArticlePaths).toContain('/news-blog/a-year-of-impact-value-and-momentum-2023/24-annual-report');
  expect(orderedNews.map((article) => article.path).sort()).toEqual([...newsArticlePaths].sort());

  for (const path of [...newsListingPaths, ...newsArticlePaths]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
  }
  expect((await page.goto('/news-blog/page/2'))?.status()).toBe(404);
});

test('News listing thumbnails do not become detail-page heroes', async ({ page }) => {
  const listingOnlyImagePaths = [
    ['/news-blog/a-year-of-impact-value-and-momentum-2023/24-annual-report', 0],
    ['/news-blog/media-statement-changes-needed-to-make-new-zealand-the-place-where-talent-wants-to-live-says-report', 0],
    ['/news-blog/navigating-2024-with-stubborn-optimism-a-conversation-with-rosalie-nelson', 8],
    ['/news-blog/new-hillary-institute-amp-edmund-hillary-fellowship-board-chair-elected', 0],
    ['/news-blog/the-hillary-institute-and-edmund-hillary-fellowship-submission-on-the-treaty-principles-bill', 0],
    ['/news-blog/the-hillary-institute-ehf-submission-on-amending-foreign-investment-funds-rules-for-migrants', 0]
  ] as const;

  await page.goto('/news-blog');
  for (const [path] of listingOnlyImagePaths) {
    const card = page.locator('[data-news-card]').filter({ has: page.locator(`a[href="${path}"]`) });
    await expect(card.locator('.news-card__image img'), path).toHaveCount(1);
  }

  for (const [path, bodyImageCount] of listingOnlyImagePaths) {
    await page.goto(path);
    await expect(page.locator('.article-page__hero'), path).toHaveCount(0);
    await expect(page.locator('.article-page__body img'), path).toHaveCount(bodyImageCount);
  }
});

test('News listing uses the source card artwork and focal crop independently of article media', async ({ page }) => {
  const listingArtwork = {
    'fellow-led-board-established-with-four-fellows-appointed-as-new-directors': '/assets/images/content/news-blog-fellow-led-board-established-with-four-fellows-appointed-as-new-directors-listing.png',
    'impact-springboard-showcases-leading-innovation-for-global-impact': '/assets/images/content/news-blog-impact-springboard-showcases-leading-innovation-for-global-impact-listing.png',
    'reflections-this-waitangi-day-2024': '/assets/images/content/news-blog-reflections-this-waitangi-day-2024-listing.jpg',
    '2022-2023-pilot-visa-programme-drives-economic-and-social-impact-for-aotearoa-nz': '/assets/images/content/news-blog-2022-2023-pilot-visa-programme-drives-economic-and-social-impact-for-aotearoa-nz-listing.jpg',
    'reflections-of-sir-edmund-hillarys-legacy-on-everest-day': '/assets/images/content/news-blog-reflections-of-sir-edmund-hillarys-legacy-on-everest-day-listing.jpg',
    'ehfs-final-welcome-experience-sees-60-fellows-welcomed-to-the-fellowship-aotearoa': '/assets/images/content/news-blog-ehfs-final-welcome-experience-sees-60-fellows-welcomed-to-the-fellowship-aotearoa-listing.jpg',
    'ehf-welcomes-95-fellows-in-march-welcome-experience': '/assets/images/content/news-blog-ehf-welcomes-95-fellows-in-march-welcome-experience-listing.jpg',
    '2021-2022-annual-report-shows-year-of-impact': '/assets/images/content/news-blog-2021-2022-annual-report-shows-year-of-impact-listing.png'
  } as const;

  await page.goto('/news-blog');
  for (const [slug, imagePath] of Object.entries(listingArtwork)) {
    const image = page.locator(`[data-news-slug="${slug}"] .news-card__image img`);
    await expect(image, slug).toHaveAttribute('src', imagePath);
  }

  const annualReport = page.locator('[data-news-slug="a-year-of-impact-value-and-momentum-2023-24-annual-report"] .news-card__image img');
  await expect(annualReport).toHaveCSS('object-position', '47.4781% 5.65529%');
  const firstCard = page.locator('[data-news-slug="media-release-new-executive-directors-to-lead-hillary-institute-amp-edmund-hillary-fellowshipnbsp"] .news-card__image img');
  const connections = page.locator('[data-news-slug="2023-a-year-of-connections-impact-and-milestones"] .news-card__image img');
  await expect(firstCard).toHaveCSS('object-position', '27.9977% 17.1011%');
  await expect(connections).toHaveCSS('object-position', '71.0765% 72.9201%');
});

test('News gallery articles preserve the source image sets', async ({ page }) => {
  const galleryArticles = [
    ['/news-blog/2023-a-year-of-connections-impact-and-milestones', 45],
    ['/news-blog/building-a-basecamp-for-a-better-world-begins-at-2025-hillary-innovation-summit', 18]
  ] as const;

  for (const [path, imageCount] of galleryArticles) {
    await page.goto(path);
    const images = page.locator('.article-page__body img');
    await expect(images, path).toHaveCount(imageCount);
    expect(await images.evaluateAll((items) => items.every((image) => image.getAttribute('src')?.startsWith('/assets/'))), path).toBe(true);
  }
});

test('News listing preserves chronological order with source query-cursor pagination', async ({ page }) => {
  await page.goto('/news-blog');
  await expect(page.locator('[data-news-slug]')).toHaveCount(27);
  const firstPageSlugs = await page.locator('[data-news-slug]:visible').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-news-slug'))
  );
  expect(firstPageSlugs).toEqual(orderedNews.slice(0, 20).map((article) => article.slug));
  await expect(page.locator('[data-news-slug]:visible')).toHaveCount(20);
  await expect(page.getByRole('link', { name: 'Older Posts' })).toHaveAttribute('href', '?offset=1675630776192');
  await expect(page.getByRole('link', { name: 'Newer Posts' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Older Posts' }).click();
  await expect(page).toHaveURL(/\/news-blog\?offset=1675630776192$/);
  const olderPageSlugs = await page.locator('[data-news-slug]:visible').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-news-slug'))
  );
  expect(olderPageSlugs).toEqual(orderedNews.slice(20).map((article) => article.slug));
  await expect(page.locator('[data-news-slug]:visible')).toHaveCount(7);
  await expect(page.getByRole('link', { name: 'Newer Posts' })).toHaveAttribute('href', '?offset=1671747295026&reversePaginate=true');
  await expect(page.getByRole('link', { name: 'Older Posts' })).toHaveCount(0);

  await page.goto('/news-blog?offset=unrecognized');
  await expect(page.locator('[data-news-slug]:visible')).toHaveCount(20);
});

test('News listing exposes every article without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/news-blog');
    await expect(page.locator('[data-news-slug]:visible')).toHaveCount(27);
    await expect(page.getByRole('navigation', { name: 'News pagination' })).toBeHidden();
  } finally {
    await context.close();
  }
});

test('News cards retain the source editorial metadata and responsive geometry', async ({ page }, testInfo) => {
  await page.goto('/news-blog');

  const cards = page.locator('[data-news-card]:visible');
  const cardCount = await cards.count();
  expect(cardCount).toBe(20);
  await expect(cards.locator('time')).toHaveCount(20);
  await expect(cards.getByRole('link', { name: 'Read More' })).toHaveCount(20);

  const metadata = await cards.evaluateAll((elements) => elements.map((card) => {
    const time = card.querySelector('time');
    const readMore = [...card.querySelectorAll('a')].find((link) => link.textContent?.trim() === 'Read More');
    return {
      date: time?.textContent?.trim(),
      dateTime: time?.getAttribute('datetime'),
      readMoreDecoration: readMore ? getComputedStyle(readMore).textDecorationLine : ''
    };
  }));
  expect(metadata.every(({ date, dateTime, readMoreDecoration }) =>
    /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(date ?? '')
    && /^\d{4}-\d{2}-\d{2}$/.test(dateTime ?? '')
    && readMoreDecoration === 'none'
  )).toBe(true);

  const geometry = await page.locator('[data-news-listing]').evaluate((listing) => {
    const grid = listing.querySelector<HTMLElement>('.news-grid')!;
    const cards = [...listing.querySelectorAll<HTMLElement>('[data-news-card]')].filter((card) => card.getClientRects().length > 0);
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
  expect(geometry.imageRatios.every((ratio) => Math.abs(ratio - (676 / 452)) < 0.03)).toBe(true);
  if (testInfo.project.name === 'desktop') {
    expect(geometry.columns).toBe(2);
    expect(geometry.columnGap).toBeCloseTo(30, 0);
    expect(geometry.positions[0].top).toBeCloseTo(geometry.positions[1].top, 1);
    expect(geometry.positions[2].top).toBeGreaterThan(geometry.positions[0].top);
    expect(geometry.positions[0].width).toBeCloseTo(676, -1);
  } else {
    expect(geometry.columns).toBe(1);
    expect(geometry.positions[1].top).toBeGreaterThan(geometry.positions[0].top);
  }
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
    expect(geometry.imageWidth).toBeCloseTo(640, -1);
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

test('Ticket 8 programme renders every live Summit row as an ordered semantic table', async ({ page }) => {
  await page.goto('/2025-summit-programme');
  const rootTextNodes = await page.locator('main').evaluate((main) => [...main.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
    .map((node) => node.textContent?.trim()));
  expect(rootTextNodes).toEqual([]);


  const dayOne = page.locator('#summit-day-1-panel');
  const dayTwo = page.locator('#summit-day-2-panel');
  await expect(dayOne.locator('table')).toHaveCount(1);
  await expect(dayOne.locator('tbody > tr')).toHaveCount(33);
  await expect(dayTwo.locator('tbody > tr')).toHaveCount(30);

  const dayOneRows = await dayOne.locator('tbody > tr').evaluateAll((rows) => rows.map((row) => ({
    time: row.querySelector<HTMLElement>('[data-event-time]')?.textContent?.trim() ?? null,
    text: row.textContent?.trim() ?? '',
    content: row.querySelector<HTMLElement>('[data-event-content]')?.textContent?.trim() ?? '',
    cellCount: (row as HTMLTableRowElement).cells.length,
    isSourceBand: row.classList.contains('event-programme__item--source-band'),
    background: getComputedStyle(row).backgroundColor
  })));
  expect(dayOneRows[2]).toMatchObject({ time: null, text: '', content: '', cellCount: 0, isSourceBand: false });
  expect(dayOneRows.slice(14, 20).map((row) => row.time)).toEqual(['2.45pm', '', '', '', '', '']);
  expect(dayOneRows.slice(21, 27).map((row) => row.time)).toEqual(['4.00pm', '', '', '', '', '']);
  expect(dayOneRows.slice(14, 20).map((row) => row.content)).toEqual([
    'Future Of',
    'The Future Of: TravelHow will new technologies and emerging innovations transform travel in the future? What role will Aotearoa play in this transformation? Join two US and 2 NZ panelists to explore the connection opportunities between NZ and the US.Panelists:Adam Grosser, EHF Fellow; Chairman & Managing Partner, UP.PartnersNikhil Ravishankar, Chief Digital Officer, Air New ZealandDavid Stout, CEO and Co-Founder, WebAIDarrin Grafton, CEO, SerkoModerator:Michael Tchao, EHF Fellow; VP Product Marketing, Apple',
    'Innovation Economy',
    'Founder First: How We Connect and Support Innovation LeadersBeing a founder from New Zealand can be tough. As a US mentor it can be as tough helping. Linda, through her LevelUp programme, has worked with 75 Kiwi entrepreneurs to figure out the formula. Join Linda as she explains her \'mentoring\' experiment and join in a discussion about what works for founders and what it takes to be an effective mentor in the New Zealand founder ecosystem.Linda Jenkinson, Founder, Chair & CEO, LevelUp',
    'Planetary Action',
    'Case Study: Catalysing Ocean-Based Ventures for the PacificDive deep into a case study of how a blended finance model has catalysed new ocean-based ventures in Aotearoa NZ - and explore how it might be applied as a new model for Pacific climate innovation.Nigel Bradly, Founder & CEO, EnvirostratLarry Tchiou, EHF Fellow; Impact Entrepreneur & Innovation Consultant'
  ]);

  const sourceBandRows = dayOneRows.filter((row) => row.isSourceBand);
  expect(sourceBandRows).toHaveLength(13);
  expect(sourceBandRows.every((row) => row.background === 'rgb(238, 238, 238)')).toBe(true);
  expect(dayOneRows.find((row) => row.time === '5.30pm' && row.content === 'Summit Day One End')).toMatchObject({
    isSourceBand: false,
    background: 'rgba(0, 0, 0, 0)'
  });
  const caseStudy = dayOne.locator('tbody > tr').nth(12).locator('p').filter({ hasText: 'Case Study: How Mobility, Connectivity and AI are Driving the Future of Travel' });
  await expect(caseStudy).toHaveCount(1);
  expect(await caseStudy.evaluate((paragraph) => paragraph.innerHTML.includes('</strong><br'))).toBe(true);
  const dayTwoRows = await dayTwo.locator('tbody > tr').evaluateAll((rows) => rows.map((row) => ({
    time: row.querySelector<HTMLElement>('[data-event-time]')?.textContent?.trim() ?? null,
    content: row.querySelector<HTMLElement>('[data-event-content]')?.textContent?.trim() ?? '',
    isSourceBand: row.classList.contains('event-programme__item--source-band'),
    background: getComputedStyle(row).backgroundColor
  })));
  expect(dayTwoRows.slice(6, 12).map((row) => row.time)).toEqual(['11.15am', '', '', '', '', '']);
  expect(dayTwoRows.slice(13, 19).map((row) => row.time)).toEqual(['12.15pm', '', '', '', '', '']);
  expect(dayTwoRows.slice(20, 26).map((row) => row.time)).toEqual(['2.00pm', '', '', '', '', '']);
  const dayTwoSourceBands = dayTwoRows.filter((row) => row.isSourceBand);
  expect(dayTwoSourceBands).toHaveLength(14);
  expect(dayTwoSourceBands.every((row) => row.background === 'rgb(238, 238, 238)')).toBe(true);
  expect(sourceBandRows.length + dayTwoSourceBands.length).toBe(27);
});

test('Ticket 8 renders both Summit day tables without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    await page.goto('/2025-summit-programme');
    const dayOne = page.locator('#summit-day-1-panel');
    const dayTwo = page.locator('#summit-day-2-panel');
    await expect(dayOne).toBeVisible();
    await expect(dayTwo).toBeVisible();
    await expect(dayOne.locator('tbody > tr')).toHaveCount(33);
    await expect(dayTwo.locator('tbody > tr')).toHaveCount(30);
  } finally {
    await context.close();
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

const institutionalLegalPaths = [
  '/about-ehf',
  '/communitycollective',
  '/journey',
  '/our-values',
  '/summer-edition-2025',
  '/privacy-policy',
  '/refund-policy-terms-and-conditions',
  '/terms-of-use'
] as const;

test('institutional and legal routes are exactly manifest-bounded and unmatched paths serve the intentional 404', async ({ page }) => {
  const emitted = routeManifest.routes
    .filter((route) => route.kind === 'included' && (route.family === 'institutional' || route.family === 'legal'))
    .map((route) => route.path)
    .sort();
  expect(emitted).toEqual([...institutionalLegalPaths].sort());

  for (const route of institutionalLegalPaths) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main article')).toHaveCount(1);
  }

  for (const route of ['/homepage', '/january-2023', '/not-a-page']) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  }
});

test('legal source links preserve all twenty href bytes, including the documented merged Stripe and PayPal defect', async ({ page }) => {
  const legalRecords = contentManifest.content.filter((record) => record.template === 'legal' && typeof record.localInput === 'string');
  const links = legalRecords.flatMap((record) => {
    const input = JSON.parse(readFileSync(resolve(process.cwd(), record.localInput!), 'utf8')) as { route: string; links: { label: string; href: string }[] };
    return input.links.map((link) => ({ ...link, route: input.route }));
  });
  expect(links).toHaveLength(20);
  for (const legalRecord of legalRecords) {
    const input = JSON.parse(readFileSync(resolve(process.cwd(), legalRecord.localInput!), 'utf8')) as { route: string; links: { href: string }[] };
    await page.goto(input.route);
    const rendered = await page.locator('[data-page-template="legal"] a').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href')));
    expect(rendered).toEqual(input.links.map((link) => link.href));
  }
  const defect = 'https://stripe.com/nz/legal%20and%20https://www.paypal.com/ad/webapps/mpp/ua/useragreement-full%20for%20more%20details';
  expect(links.find((link) => link.href === defect)?.href).toBe(defect);
  expect(createHash('sha256').update(defect, 'utf8').digest('hex')).toBe('c189373a81f8f2c329a923bc00f77a5612a0c76ef59113d1aef00f72a1e5d2d8');
});

test('Ticket 10 emits all and only the nine declared contact-media-donation routes', async ({ page }) => {
  const expected = [
    '/contact-media',
    '/contact-us',
    '/donation-more-than-10k',
    '/donation-outside-nz-and-us',
    '/donation-pledge',
    '/donation-refund-request',
    '/ehf-friendly-sharks-waiting-list',
    '/media-inquiries',
    '/news-and-events-updates'
  ];
  const declared = routeManifest.routes
    .filter((route) => route.kind === 'included' && route.family === 'contact-media-donation')
    .map((route) => route.path);
  expect(declared).toEqual(expected);

  for (const route of declared) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
  }

  const donate = await page.goto('/donate');
  expect(donate?.status()).toBe(404);
});

test('Impact in Action remains a distinct Read and Watch landing page', async ({ page }) => {
  const response = await page.goto('/impact-in-action');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/impact-in-action$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Creating Impact is an Everlasting Journey' })).toHaveCount(1);
  await expect(page.locator('.impact-landing__read-card')).toHaveCount(12);
  await expect(page.locator('.impact-landing__watch-card')).toHaveCount(12);
  await expect(page.getByRole('link', { name: 'Read All Impact Stories' })).toHaveAttribute('href', '/read');
  await expect(page.getByRole('link', { name: 'Watch All Impact Videos' })).toHaveAttribute('href', '/watch');
  expect(await page.locator('.impact-landing img').evaluateAll((images) =>
    images.every((image) => new URL(image.getAttribute('src') || '', document.baseURI).pathname.startsWith('/assets/'))
  )).toBe(true);
});

test('Watch restores all 88 video details and offset pagination', async ({ page }) => {
  expect(watchArticlePaths).toHaveLength(88);
  const response = await page.goto('/watch');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Watch', exact: true })).toHaveCount(1);
  await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.watch-card:visible')).toHaveCount(20);
  await expect(page.getByRole('link', { name: 'Older Posts' })).toHaveAttribute('href', '/watch?offset=1659267549153');
  const firstPageTop = await page.locator('.watch-card:visible').first().evaluate((card) => card.getBoundingClientRect().top);

  await page.getByRole('link', { name: 'Older Posts' }).click();
  await expect(page).toHaveURL(/\/watch\?offset=1659267549153$/);
  await expect(page.locator('.watch-card:visible')).toHaveCount(20);
  const secondPageTop = await page.locator('.watch-card:visible').first().evaluate((card) => card.getBoundingClientRect().top);
  expect(Math.abs(secondPageTop - firstPageTop)).toBeLessThan(2);
  await expect(page.getByRole('link', { name: 'Newer Posts' })).toHaveAttribute(
    'href',
    '/watch?offset=1659267474238&reversePaginate=true'
  );

  const detail = await page.goto(watchArticlePaths[0]);
  expect(detail?.status()).toBe(200);
  await expect(page.locator('.watch-article h1')).not.toHaveText('');
  await expect(page.locator('.watch-article a[href^="https://www.youtube.com/watch?v="]')).toHaveCount(1);
  expect(await page.locator('.watch-article img').evaluateAll((images) =>
    images.every((image) => new URL(image.getAttribute('src') || '', document.baseURI).pathname.startsWith('/assets/'))
  )).toBe(true);
});

test('Fellows Articles and the linked hash-slug Impact article remain public', async ({ page }) => {
  expect(fellowsArticlePaths).toHaveLength(4);
  const listing = await page.goto('/ehf-fellows-articles');
  expect(listing?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'EHF Fellows Articles', exact: true })).toHaveCount(1);
  await expect(page.locator('.fellows-article-card')).toHaveCount(4);
  const fellowsCards = page.locator('.fellows-article-card');
  await expect(fellowsCards.first()).toContainText('What inspired the creation of your product?');
  expect(await fellowsCards.evaluateAll((cards) =>
    cards.every((card) => card.querySelectorAll('.fellows-article-card__body p').length >= 3)
  )).toBe(true);
  await expect(fellowsCards.locator('.fellows-article-card__date')).toHaveCount(4);
  await expect(fellowsCards.first().locator('.fellows-article-card__date')).toHaveText('5/29/19');
  const sourceBodyGeometry = await fellowsCards.nth(1).locator('.fellows-article-card__body p').first().evaluate((paragraph) => ({
    alignment: getComputedStyle(paragraph).textAlign,
    paragraphWidth: paragraph.getBoundingClientRect().width,
    bodyWidth: paragraph.closest('.fellows-article-card__body')?.getBoundingClientRect().width ?? 0
  }));
  expect(sourceBodyGeometry.alignment).toBe('center');
  expect(Math.abs(sourceBodyGeometry.paragraphWidth - sourceBodyGeometry.bodyWidth)).toBeLessThan(2);
  const profile = fellowsCards.first().locator('.fellows-profile');
  await expect(profile.locator('img')).toHaveCount(1);
  await expect(profile.locator('.fellows-profile__card')).toHaveCSS('background-color', 'rgb(224, 255, 252)');
  expect(await profile.evaluate((element) => {
    const image = element.querySelector('img')?.getBoundingClientRect();
    const panel = element.querySelector('.fellows-profile__card')?.getBoundingClientRect();
    if (!image || !panel) return false;
    return image.width >= element.getBoundingClientRect().width * 0.55
      && panel.right > image.left
      && panel.top < image.bottom
      && panel.bottom > image.top;
  })).toBe(true);
  await expect(page.locator('header a[href="/ehf-fellows-articles"]')).not.toHaveCount(0);

  for (const path of fellowsArticlePaths) {
    const detail = await page.goto(path);
    expect(detail?.status(), path).toBe(200);
    await expect(page.locator('.fellows-article h1')).not.toHaveText('');
  }

  const impact = await page.goto('/read/swe2a87gjavk3i0brqd2buom9z1hec');
  expect(impact?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Celebrating the ways of being' })).toHaveCount(1);
});

test('Archive restores its four source sections with complete local route sets', async ({ page }) => {
  const response = await page.goto('/archive');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Archive', exact: true })).toHaveCount(1);

  const sections = page.locator('.archive-section');
  await expect(sections).toHaveCount(4);
  await expect(sections.nth(0).getByRole('heading', { level: 2, name: 'EHF Organisation News Archive' })).toHaveCount(1);
  await expect(sections.nth(1).getByRole('heading', { level: 2, name: 'Fellows’ News Archive' })).toHaveCount(1);
  await expect(sections.nth(2).getByRole('heading', { level: 2, name: 'Annual Reports Archive' })).toHaveCount(1);
  await expect(sections.nth(3).getByRole('heading', { level: 2, name: 'Events Archive' })).toHaveCount(1);
  await expect(sections.nth(0).locator('.archive-card')).toHaveCount(28);
  await expect(sections.nth(1).locator('.archive-card')).toHaveCount(32);
  await expect(sections.nth(2).locator('a[href$=\".pdf\"]')).toHaveCount(7);
  const events = sections.nth(3);
  await expect(events.locator('.summit-gallery__stage img')).toHaveCount(1);
  await expect(events.locator('.summit-gallery__thumbnail')).toHaveCount(71);
  await expect(events.locator('.summit-gallery__previous')).toHaveCount(1);
  await expect(events.locator('.summit-gallery__next')).toHaveCount(1);
  const arrowStageSource = await events.locator('.summit-gallery__stage img').getAttribute('src');
  await events.locator('.summit-gallery__next').click();
  await expect(events.locator('.summit-gallery__stage img')).not.toHaveAttribute('src', arrowStageSource ?? '');
  const firstStageSource = await events.locator('.summit-gallery__stage img').getAttribute('src');
  await events.locator('.summit-gallery__thumbnail').nth(2).click();
  await expect(events.locator('.summit-gallery__stage img')).not.toHaveAttribute('src', firstStageSource ?? '');
  await expect(events.locator('.event-sessions')).toHaveCSS('background-color', 'rgb(90, 50, 164)');
  await expect(events.locator('.event-sessions .archive-video-link')).toHaveCount(2);
  await expect(events.locator('.impact-springboard .archive-video-link')).toHaveCount(5);
  await expect(events.locator('a[href^="http"]')).toHaveCount(16);
  const springboardCards = await events.locator('.impact-springboard__session').evaluateAll((cards) =>
    cards.map((card) => card.getBoundingClientRect().width)
  );
  const desktop = (page.viewportSize()?.width ?? 0) > 767;
  if (desktop) expect(springboardCards.every((width) => Math.abs(width - 337) < 2)).toBe(true);
  else expect(springboardCards.every((width) => width > 300 && width < 390)).toBe(true);
  const keyThemesGeometry = await events.locator('.event-feature__image').evaluate((image) => ({
    imageWidth: image.getBoundingClientRect().width,
    parentWidth: image.parentElement?.getBoundingClientRect().width ?? 0
  }));
  if (desktop) expect(Math.abs(keyThemesGeometry.imageWidth - 1324) < 2).toBe(true);
  expect(keyThemesGeometry.imageWidth <= keyThemesGeometry.parentWidth).toBe(true);
  expect(await events.locator('img').evaluateAll((images) =>
    images.every((image) => new URL(image.getAttribute('src') || '', document.baseURI).pathname.startsWith('/assets/'))
  )).toBe(true);

  const localDestinations = new Set(routeManifest.routes
    .filter((route) => route.kind === 'included')
    .map((route) => route.path));
  const archiveInternalLinks = await page.locator('.archive-section a[href^=\"/\"]:not([href^=\"/assets/\"])').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href'))
  );
  expect(archiveInternalLinks.every((href) => href !== null && localDestinations.has(href))).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('all Fellows’ News snapshots are static pages rendered by one local-media template', async ({ page }) => {
  const snapshots = routeManifest.routes
    .filter((route) => route.kind === 'included' && route.family === 'fellows-news-snapshot')
    .map((route) => route.path);
  expect(snapshots).toHaveLength(31);

  for (const path of snapshots) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Impact Snapshot', exact: true })).toHaveCount(1);
  }

  await page.goto('/june-2025');
  await expect(page.locator('.snapshot-page__month')).toHaveText('June 2025');
  await expect(page.locator('.snapshot-story')).not.toHaveCount(0);
  const imageSources = await page.locator('.snapshot-page img').evaluateAll((images) =>
    images.map((image) => image.getAttribute('src'))
  );
  expect(imageSources.length).toBeGreaterThan(0);
  expect(imageSources.every((source) => source?.startsWith('/assets/'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});