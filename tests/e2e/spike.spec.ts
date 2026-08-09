import { expect, test, type Page } from '@playwright/test';

const spikeRoutes = [
  '/',
  '/read',
  '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
  '/23-annual-report'
] as const;

async function settleGeometry(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const { promise, resolve } = Promise.withResolvers<void>();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    await promise;
  });
}

const archiveTitles = [
  'How Chemergy is Changing the Game in Waste-to-Energy',
  "Harnessing Pine Pollen's Power to Transform Wellbeing",
  'Globalising Kiwi Innovation',
  'Helping to Solve the Unsolvable Challenges',
  'Championing Māori and Indigenous Enterprise and Cultural Values',
  'Unlocking the Potential of Offshore Wind',
  'Building Climate Resilience in the Pacific & Aotearoa',
  'Leading the Metaverse Revolution from Aotearoa NZ',
  'Solving the Ocean Plastics Problem',
  'Nature-Inspired Solutions for Global Environmental Health',
  'Catalysing Environmental Action for a Sustainable Future',
  'Tackling Global Textile Waste through Innovative Solutions',
  'The Awa/River Story Inspiring Connection & Action',
  'Te Pā o Rākaihautū: From Vision to Reality',
  'Creating opportunities for Māori & Pasifika talent in gaming',
  "Activating Generational Change for Aotearoa NZ's Wellbeing",
  'Transforming lives in Niue by eliminating Hepatitis',
  'Cultivating Indigenous Entrepreneurship',
  "Accessible Tech that's Breaking Down Barriers",
  'Opening doors for rangatahi (young people) in tech'
] as const;

for (const route of spikeRoutes) {
  test(`${route} renders source-backed content in the shared shell`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('img').first()).toHaveAttribute('src', /^\/assets\//);
  });
}

test('the archive preserves all 20 source cards in source order', async ({ page }) => {
  await page.goto('/read');

  const cards = page.locator('[data-read-card]');
  await expect(cards).toHaveCount(20);
  expect(await cards.locator('h2').allTextContents()).toEqual(archiveTitles);
  const older = page.getByRole('link', { name: 'Older Posts' });
  await expect(older).toBeVisible();
  await expect(older.locator('.read-page__older-chevron')).toHaveText('');
  await expect(older).toHaveCSS('text-decoration-line', 'none');
});

test('the archive uses a single source-order stack on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile stack contract');
  await page.goto('/read');
  await settleGeometry(page);

  const positions = await page.locator('[data-read-card]').evaluateAll((cards) => cards.slice(0, 4).map((card) => {
    const { left, top } = card.getBoundingClientRect();
    return { left: Math.round(left), top: Math.round(top) };
  }));

  expect(positions.map(({ left }) => left)).toEqual([positions[0].left, positions[0].left, positions[0].left, positions[0].left]);
  expect(positions.map(({ top }) => top)).toEqual([...positions.map(({ top }) => top)].sort((a, b) => a - b));
});

test('desktop archive places each card in the true shortest source column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop masonry contract');
  await page.goto('/read');
  await settleGeometry(page);

  const cards = await page.locator('[data-read-card]').evaluateAll((nodes) => nodes.slice(0, 6).map((card) => {
    const { left, top } = card.getBoundingClientRect();
    return { left: Math.round(left), top: Math.round(top) };
  }));
  const columns = cards.slice(0, 4).map(({ left }) => left);

  expect(cards.map(({ left }) => columns.indexOf(left))).toEqual([0, 1, 2, 3, 2, 0]);
  expect(cards[4].top).toBeLessThan(cards[5].top);
});

test('only the Awa/River card preserves its source landscape image ratio', async ({ page }) => {
  await page.goto('/read');
  await settleGeometry(page);

  const awaImage = page.getByRole('heading', { name: 'The Awa/River Story Inspiring Connection & Action' })
    .locator('..')
    .locator('img');
  const { width, height } = await awaImage.evaluate((image) => {
    const rect = image.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

  expect(width / height).toBeCloseTo(343 / 288, 2);
});

test('the article keeps its fixed-source engineer figure within a 320px viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'small mobile overflow contract');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  await settleGeometry(page);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('Older Posts uses the measured body line box and masked source caret', async ({ page }, testInfo) => {
  await page.goto('/read');

  const older = page.getByRole('link', { name: 'Older Posts' });
  const lineHeight = await older.evaluate((link) => Number.parseFloat(getComputedStyle(link).lineHeight));
  expect(lineHeight).toBeCloseTo(testInfo.project.name === 'desktop' ? 35.0208 : 32.4461, 2);

  const caret = older.locator('.read-page__older-chevron');
  await expect(caret).toHaveAttribute('aria-hidden', 'true');
  expect(await caret.evaluate((icon) => {
    const styles = getComputedStyle(icon);
    const rect = icon.getBoundingClientRect();
    return {
      backgroundColor: styles.backgroundColor,
      borderBottomWidth: styles.borderBottomWidth,
      borderRightWidth: styles.borderRightWidth,
      height: rect.height,
      maskImage: styles.maskImage,
      width: rect.width
    };
  })).toEqual({
    backgroundColor: 'rgb(39, 36, 46)',
    borderBottomWidth: '0px',
    borderRightWidth: '0px',
    height: 16,
    maskImage: expect.not.stringMatching(/^none$/),
    width: 9
  });
});

test('only the accepted impact Markdown article is generated', async ({ page }) => {
  await expect(page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy')).resolves.not.toBeNull();
  const rejected = await page.goto('/read/harnessing-pine-pollens-power-to-transform-wellbeing');
  expect(rejected?.status()).toBe(404);
});

test('the annual report supplies three safe local PDF downloads', async ({ page }) => {
  await page.goto('/23-annual-report');

  const downloads = page.locator('a[data-pdf-download]');
  await expect(downloads).toHaveCount(3);
  expect(await downloads.evaluateAll((nodes) => nodes.map((node) => ({
    href: node.getAttribute('href'),
    target: node.getAttribute('target'),
    rel: node.getAttribute('rel')
  })))).toEqual([
    { href: '/assets/documents/ehf-hi-annual-report-2023.pdf', target: '_blank', rel: 'noopener noreferrer' },
    { href: '/assets/documents/edmund-hillary-fellowship-limited-2023-financial-statements.pdf', target: '_blank', rel: 'noopener noreferrer' },
    { href: '/assets/documents/the-hillary-institute-subsidiary-entities-2023-financial-statements.pdf', target: '_blank', rel: 'noopener noreferrer' }
  ]);
});

test('the captured closure homepage contains only the hero and one organisation-fellowship band', async ({ page }) => {
  await page.goto('/');

  const hero = page.locator('[data-home-hero]');
  await expect(hero).toContainText('500+ Fellows');
  await expect(hero).toContainText('50+ Nationalities');
  await expect(hero.getByRole('link', { name: /fellow.?directory/i })).toHaveCount(0);

  const band = page.locator('[data-home-band]');
  await expect(band).toContainText('EHF - The Organisation');
  await expect(band).toContainText('The Fellowship');
  await expect(band).toContainText('Talented and connected innovators have built deep connections with New Zealand communities, businesses, and innovation ecosystem, creating a positive global impact.');
  await expect(band.locator('p')).toHaveCount(2);
  await expect(page.locator('.legacy-section, .impact-callout, .home-stats')).toHaveCount(0);
});

test('the organisation band establishes a stacking context for its painted artwork', async ({ page }) => {
  await page.goto('/');

  const band = page.locator('[data-home-band]');
  const artwork = band.locator('img');
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveJSProperty('complete', true);
  expect(await artwork.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(band).toHaveCSS('isolation', 'isolate');
  await expect(artwork).toHaveCSS('z-index', '-2');
});

test('the archive has only a semantic hidden heading', async ({ page }) => {
  await page.goto('/read');
  await expect(page.locator('.read-page > h1')).toHaveClass(/visually-hidden/);
});

test('the article omits unsourced author chrome and keeps a title-only next link', async ({ page }) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');

  await expect(page.locator('img[src="/assets/images/article/author-avatar.webp"]')).toHaveCount(0);
  const next = page.getByRole('navigation', { name: 'Article navigation' });
  await expect(next).not.toContainText('Next');
  await expect(next.getByRole('link', { name: "Harnessing Pine Pollen's Power to Transform Wellbeing" })).toBeVisible();
});

test('the article uses the rotated source images, semantic credits, and stable section hook', async ({ page }) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');

  await expect(page.locator('.article-figure--dsc-crop img')).toHaveAttribute('src', '/assets/images/article/chemergy-figure-1.webp');
  await expect(page.locator('.article-page__body figure').nth(1).locator('img')).toHaveAttribute('src', '/assets/images/article/chemergy-figure-2.webp');
  await expect(page.locator('.article-figure--engineer-float img')).toHaveAttribute('src', '/assets/images/article/dsc-3025.webp');
  await expect(page.locator('.article-page__body figcaption em')).toHaveCount(4);
  await expect(page.locator('.article-section-break')).toHaveCount(1);
});

test('the article applies measured type, figure, and pagination geometry', async ({ page }, testInfo) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  await settleGeometry(page);

  const mobile = testInfo.project.name === 'mobile';
  const bodyMetrics = await page.locator('.article-page__body > p').nth(1).evaluate((paragraph) => {
    const styles = getComputedStyle(paragraph);
    return { fontSize: Number.parseFloat(styles.fontSize), lineHeight: Number.parseFloat(styles.lineHeight) };
  });
  expect(bodyMetrics.fontSize).toBeCloseTo(mobile ? 18.9 : 20, 1);
  expect(bodyMetrics.lineHeight).toBeCloseTo(mobile ? 32.4461 : 35.0208, 2);
  await expect(page.locator('.article-page__header h1')).toHaveCSS('margin-bottom', mobile ? '71px' : '68px');
  await expect(page.locator('.article-page__body blockquote').first()).toHaveCSS('margin-left', '40px');
  await expect(page.locator('.article-page__body figcaption').first()).toHaveCSS('margin-top', '16px');
  await expect(page.locator('.article-page__body h2').first()).toHaveCSS('margin-top', '32.4px');
  await expect(page.locator('.article-section-break')).toHaveCSS('margin-top', '34px');

  const dsc = page.locator('.article-figure--dsc-crop img');
  const engineer = page.locator('.article-figure--engineer-float img');
  const dscBox = await dsc.boundingBox();
  const engineerBox = await engineer.boundingBox();
  expect(dscBox?.height).toBeCloseTo(mobile ? 124.96 : 392.39, 0);
  expect(engineerBox?.height).toBeCloseTo(mobile ? 163 : 259, 0);

  const next = page.getByRole('navigation', { name: 'Article navigation' });
  await expect(next).toHaveCSS('display', 'flex');
  const caret = next.locator('.article-page__next-chevron');
  await expect(caret).toHaveAttribute('aria-hidden', 'true');
  expect(await caret.evaluate((icon) => {
    const styles = getComputedStyle(icon);
    const rect = icon.getBoundingClientRect();
    return {
      backgroundColor: styles.backgroundColor,
      borderBottomWidth: styles.borderBottomWidth,
      borderRightWidth: styles.borderRightWidth,
      height: rect.height,
      maskImage: styles.maskImage,
      width: rect.width
    };
  })).toEqual({
    backgroundColor: 'rgb(39, 36, 46)',
    borderBottomWidth: '0px',
    borderRightWidth: '0px',
    height: 32,
    maskImage: expect.not.stringMatching(/^none$/),
    width: 18
  });
  await expect(next.getByRole('link')).toHaveCSS('color', 'rgb(116, 65, 210)');
  await expect(next.getByRole('link')).toHaveCSS('text-decoration-line', 'none');

  if (mobile) {
    expect(await next.getByRole('link').evaluate((link) => {
      const range = document.createRange();
      range.selectNodeContents(link);
      return range.getClientRects().length;
    })).toBe(5);
  } else {
    await expect(engineer).toHaveCSS('object-fit', 'cover');
    await expect(page.locator('.article-figure--engineer-float')).toHaveCSS('float', 'right');
  }
});

test('every spike route has a centered wrapping footer with no horizontal overflow', async ({ page }, testInfo) => {
  for (const route of spikeRoutes) {
    await page.goto(route);
    await settleGeometry(page);
    const metrics = await page.locator('.site-footer').evaluate((footer) => {
      const styles = getComputedStyle(footer);
      const footerBox = footer.getBoundingClientRect();
      const copyright = footer.querySelector('p')!.getBoundingClientRect();
      const nav = footer.querySelector('nav')!.getBoundingClientRect();
      const firstSeparator = getComputedStyle(footer.querySelector('li')!, '::after').content;
      return {
        footerHeight: footerBox.height,
        copyrightTop: copyright.top - footerBox.top,
        gap: nav.top - copyright.bottom,
        navHeight: nav.height,
        justifyContent: styles.justifyContent,
        paddingTop: styles.paddingTop,
        paddingBottom: styles.paddingBottom,
        firstSeparator,
        scrollWidth: document.documentElement.scrollWidth
      };
    });

    const mobile = testInfo.project.name === 'mobile';
    expect(metrics.footerHeight).toBeCloseTo(mobile ? 278.52 : 330, 0);
    expect(metrics.justifyContent).toBe('center');
    expect(metrics.paddingTop).toBe(mobile ? '47.1px' : '53.6px');
    expect(metrics.paddingBottom).toBe(mobile ? '49.9px' : '53.6px');
    expect(metrics.gap).toBeCloseTo(32, 0);
    expect(metrics.firstSeparator.includes('\u200B')).toBe(!mobile);
    expect(metrics.scrollWidth).toBe(mobile ? 390 : 1440);
    if (mobile) {
      expect(metrics.copyrightTop).toBeCloseTo(47.2, 0);
      expect(metrics.navHeight).toBeCloseTo(97.8, 0);
    }
  }
});

test('the footer keeps semantic links while permitting source-like inline wrapping', async ({ page }, testInfo) => {
  await page.goto('/');
  await settleGeometry(page);

  const footer = page.locator('.site-footer');
  await expect(footer.getByRole('heading')).toHaveCount(0);
  const items = footer.locator('nav ul > li');
  await expect(items).toHaveCount(5);
  expect(await items.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).display))).toEqual(
    Array(5).fill('inline')
  );

  if (testInfo.project.name === 'mobile') {
    const copyright = await footer.locator('.site-footer__inner > p').evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return { lines: range.getClientRects().length, height: node.getBoundingClientRect().height };
    });
    expect(copyright.lines).toBe(2);
    expect(copyright.height).toBeCloseTo(51.3125, 0);
    expect(await footer.locator('strong', { hasText: 'Closure Statement' }).evaluate((node) => node.getClientRects().length)).toBe(2);
  }
});
