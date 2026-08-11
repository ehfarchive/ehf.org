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
  expect(impactListingPaths).toEqual(['/read', '/read/page/2', '/read/page/3', '/read/page/4', '/read/page/5']);
  expect(impactArticlePaths).toHaveLength(84);

  for (const path of [...impactListingPaths, ...impactArticlePaths]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
  }
});

test('Impact archive has deterministic source order, accessible source-style pagination, and no duplicate cards', async ({ page }) => {
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

    const pagination = page.getByRole('navigation', { name: 'Impact pagination' });
    await expect(pagination).toBeVisible();
    await expect(pagination.getByRole('link', { name: 'Newer Posts' })).toHaveCount(index === 0 ? 0 : 1);
    await expect(pagination.getByRole('link', { name: 'Older Posts' })).toHaveCount(index === archivePaths.length - 1 ? 0 : 1);
    if (index > 0) await expect(pagination.getByRole('link', { name: 'Newer Posts' })).toHaveAttribute('href', index === 1 ? '/read' : `/read/page/${index}`);
    if (index < archivePaths.length - 1) await expect(pagination.getByRole('link', { name: 'Older Posts' })).toHaveAttribute('href', `/read/page/${index + 2}`);
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

test('News emits exactly the manifest-backed listing and 27 declared article routes', async ({ page }) => {
  expect(newsListingPaths).toEqual(['/news-blog', '/news-blog/page/2']);
  expect(newsArticlePaths).toHaveLength(27);
  expect(newsArticlePaths).toContain('/news-blog/a-year-of-impact-value-and-momentum-2023/24-annual-report');
  expect(orderedNews.map((article) => article.path).sort()).toEqual([...newsArticlePaths].sort());

  for (const path of [...newsListingPaths, ...newsArticlePaths]) {
    const response = await page.goto(path);
    expect(response?.ok(), path).toBe(true);
  }
});

test('News listing uses static page links and preserves chronological card order', async ({ page }) => {
  await page.goto('/news-blog');
  const firstPageSlugs = await page.locator('[data-news-slug]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-news-slug'))
  );
  expect(firstPageSlugs).toEqual(orderedNews.slice(0, 20).map((article) => article.slug));
  await expect(page.locator('[data-news-slug]')).toHaveCount(20);
  await expect(page.locator('[data-news-card][hidden]')).toHaveCount(0);
  const listingMarkup = await page.locator('[data-news-listing]').innerHTML();
  expect(listingMarkup).not.toContain('data-news-page');
  expect(listingMarkup).not.toContain('<script');
  await expect(page.getByRole('link', { name: 'Older Posts' })).toHaveAttribute('href', '/news-blog/page/2');
  await expect(page.getByRole('link', { name: 'Newer Posts' })).toHaveCount(0);

  await page.goto('/news-blog/page/2');
  const olderPageSlugs = await page.locator('[data-news-slug]').evaluateAll((cards) =>
    cards.map((card) => card.getAttribute('data-news-slug'))
  );
  expect(olderPageSlugs).toEqual(orderedNews.slice(20).map((article) => article.slug));
  await expect(page.locator('[data-news-slug]')).toHaveCount(7);
  await expect(page.locator('[data-news-card][hidden]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Newer Posts' })).toHaveAttribute('href', '/news-blog');
  await expect(page.getByRole('link', { name: 'Older Posts' })).toHaveCount(0);

  await page.goto('/news-blog?offset=unrecognized');
  await expect(page.locator('[data-news-slug]')).toHaveCount(20);
});

test('News pagination works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    await page.goto('/news-blog');
    await page.getByRole('link', { name: 'Older Posts' }).click();
    await page.waitForURL('**/news-blog/page/2');
    await expect(page.locator('[data-news-slug]')).toHaveCount(7);
    await expect(page.getByRole('link', { name: 'Newer Posts' })).toHaveAttribute('href', '/news-blog');
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
    const cards = [...listing.querySelectorAll<HTMLElement>('[data-news-card]')].filter((card) => !card.hidden);
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