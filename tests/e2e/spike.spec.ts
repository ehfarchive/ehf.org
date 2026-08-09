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


for (const route of spikeRoutes) {
  test(`${route} renders source-backed content in the shared shell`, async ({ page }) => {
    const response = await page.goto(route);

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('img').first()).toHaveAttribute('src', /^\/assets\//);
  });
}

test('the archive renders 20 deterministic first-page cards with declared pagination', async ({ page }) => {
  await page.goto('/read');

  const cards = page.locator('[data-read-card]');
  await expect(cards).toHaveCount(20);
  await expect(cards.first()).toHaveAttribute('data-impact-slug', 'how-chemergy-is-changing-the-game-in-waste-to-energy');
  await expect(cards.first().locator('img')).toHaveAttribute('src', '/assets/images/cards/chemergy.webp');
  const pagination = page.getByRole('navigation', { name: 'Impact pagination' });
  await expect(pagination).toBeVisible();
  await expect(pagination.locator('[aria-current="page"]')).toHaveText('Page 1');
  await expect(pagination.getByRole('link', { name: 'Page 2' })).toHaveAttribute('href', '/read/page/2');
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

test('desktop archive maintains a stable four-column card grid', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop grid contract');
  await page.goto('/read');
  await settleGeometry(page);

  const cards = await page.locator('[data-read-card]').evaluateAll((nodes) => nodes.slice(0, 6).map((card) => {
    const { left, top } = card.getBoundingClientRect();
    return { left: Math.round(left), top: Math.round(top) };
  }));
  const columns = cards.slice(0, 4).map(({ left }) => left);

  expect(cards.map(({ left }) => columns.indexOf(left))).toEqual([0, 1, 2, 3, 0, 1]);
  expect(cards[4].top).toBe(cards[5].top);
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

test('Impact pagination exposes its declared numbered destinations', async ({ page }) => {
  await page.goto('/read');

  const pagination = page.getByRole('navigation', { name: 'Impact pagination' });
  await expect(pagination).toBeVisible();
  await expect(pagination.getByRole('link', { name: 'Page 5' })).toHaveAttribute('href', '/read/page/5');
  await page.goto('/read/page/5');
  await expect(page.locator('[data-read-card]')).toHaveCount(4);
  await expect(page.getByRole('navigation', { name: 'Impact pagination' }).locator('[aria-current="page"]')).toHaveText('Page 5');
});

test('manifest-declared Impact articles beyond Chemergy are generated', async ({ page }) => {
  const neighbour = await page.goto('/read/harnessing-pine-pollens-power-to-transform-wellbeing');
  expect(neighbour?.status()).toBe(200);
  const finalPage = await page.goto('/read/page/5');
  expect(finalPage?.status()).toBe(200);
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

test('the organisation band renders decodable artwork', async ({ page }) => {
  await page.goto('/');

  const band = page.locator('[data-home-band]');
  const artwork = band.locator('img');
  await expect(artwork).toBeVisible();
  await expect(artwork).toHaveJSProperty('complete', true);
  expect(await artwork.evaluate((image) => {
    const source = image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) return false;
    context.drawImage(source, source.naturalWidth / 2, source.naturalHeight / 2, 1, 1, 0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3] > 0;
  })).toBe(true);
});

test('the organisation artwork selects the exact responsive rendition', async ({ page }, testInfo) => {
  await page.goto('/');

  const picture = page.locator('[data-home-band] picture');
  const mobileSource = picture.locator('source[media="(max-width: 767px)"]');
  const artwork = picture.locator('img');
  const expectedCurrentSrc = testInfo.project.name === 'mobile'
    ? '/assets/images/home-organisation-mobile.webp'
    : '/assets/images/home-organisation.webp';

  await expect(picture.locator('source')).toHaveCount(1);
  await expect(mobileSource).toHaveAttribute('srcset', '/assets/images/home-organisation-mobile.webp');
  await expect(artwork).toHaveAttribute('src', '/assets/images/home-organisation.webp');
  await expect(artwork).toHaveJSProperty('complete', true);

  const loaded = await artwork.evaluate((image) => {
    const renderedImage = image as HTMLImageElement;
    return {
      currentSrc: renderedImage.currentSrc,
      naturalWidth: renderedImage.naturalWidth,
      naturalHeight: renderedImage.naturalHeight
    };
  });

  expect(loaded.currentSrc).toBe(new URL(expectedCurrentSrc, page.url()).href);
  expect(loaded.naturalWidth).toBeGreaterThan(0);
  expect(loaded.naturalHeight).toBeGreaterThan(0);
});

test('the archive has only a semantic hidden heading', async ({ page }) => {
  await page.goto('/read');
  await expect(page.locator('.read-page > h1')).toHaveClass(/visually-hidden/);
});

test('the article omits unsourced author chrome and keeps a title-only deterministic next link', async ({ page }) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');

  await expect(page.locator('img[src="/assets/images/article/author-avatar.webp"]')).toHaveCount(0);
  const next = page.getByRole('navigation', { name: 'Article navigation' });
  await expect(next).not.toContainText('Next');
  await expect(next.getByRole('link', { name: 'Harnessing Pine Pollen’s Power to Transform Wellbeing' })).toBeVisible();
});

test('the canonical article keeps source body images and converts source captions to semantic figures', async ({ page }) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');

  const figures = page.locator('.article-page__body figure');
  await expect(figures).toHaveCount(5);
  await expect(figures.nth(0).locator('img')).toHaveAttribute('src', '/assets/images/content/read-how-chemergy-is-changing-the-game-in-waste-to-energy-1.webp');
  await expect(figures.nth(1).locator('img')).toHaveAttribute('src', '/assets/images/content/read-how-chemergy-is-changing-the-game-in-waste-to-energy-2.webp');
  await expect(page.locator('.article-page__body figcaption')).toHaveCount(4);
});

test('the canonical article applies typed metadata, semantic figure, and next-link geometry', async ({ page }, testInfo) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  await settleGeometry(page);

  const mobile = testInfo.project.name === 'mobile';
  const bodyMetrics = await page.locator('.article-page__body > p').nth(1).evaluate((paragraph) => {
    const styles = getComputedStyle(paragraph);
    return { fontSize: Number.parseFloat(styles.fontSize), lineHeight: Number.parseFloat(styles.lineHeight) };
  });
  expect(bodyMetrics.fontSize).toBeCloseTo(mobile ? 18.9 : 20, 1);
  expect(bodyMetrics.lineHeight).toBeCloseTo(mobile ? 32.4461 : 35.0208, 2);
  await expect(page.locator('.article-page__header h1')).toHaveCSS('margin-bottom', '24px');
  await expect(page.locator('.article-page__header time')).toHaveCSS('margin-bottom', mobile ? '47px' : '68px');
  await expect(page.locator('.article-page__body blockquote').first()).toHaveCSS('margin-left', '40px');
  await expect(page.locator('.article-page__body figcaption').first()).toHaveCSS('margin-top', '16px');
  await expect(page.locator('.article-page__body h4').first()).toHaveCSS('margin-top', '32.4px');

  const figure = page.locator('.article-page__body figure').first();
  expect(await figure.evaluate((element) => {
    const image = element.querySelector('img')!;
    return image.getBoundingClientRect().width <= element.parentElement!.getBoundingClientRect().width;
  })).toBe(true);

  const next = page.getByRole('navigation', { name: 'Article navigation' });
  await expect(next).toHaveCSS('display', 'flex');
  const caret = next.locator('.article-page__next-chevron');
  await expect(caret).toHaveAttribute('aria-hidden', 'true');
  expect(await caret.evaluate((icon) => {
    const styles = getComputedStyle(icon);
    const rect = icon.getBoundingClientRect();
    return {
      backgroundColor: styles.backgroundColor,
      height: rect.height,
      maskImage: styles.maskImage,
      width: rect.width
    };
  })).toEqual({
    backgroundColor: 'rgb(39, 36, 46)',
    height: 32,
    maskImage: expect.not.stringMatching(/^none$/),
    width: 18
  });
  await expect(next.getByRole('link')).toHaveCSS('color', 'rgb(116, 65, 210)');
  await expect(next.getByRole('link')).toHaveCSS('text-decoration-line', 'none');

  if (mobile) expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
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
