import { expect, test } from '@playwright/test';

const spikeRoutes = [
  '/',
  '/read',
  '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
  '/23-annual-report'
] as const;

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
  await expect(page.getByRole('link', { name: 'Older Posts' })).toBeVisible();
});

test('the archive uses row-first desktop masonry and a single source-order stack on mobile', async ({ page }, testInfo) => {
  await page.goto('/read');

  const positions = await page.locator('[data-read-card]').evaluateAll((cards) => cards.slice(0, 4).map((card) => {
    const { left, top } = card.getBoundingClientRect();
    return { left: Math.round(left), top: Math.round(top) };
  }));

  if (testInfo.project.name === 'desktop') {
    expect(positions.map(({ top }) => top)).toEqual([positions[0].top, positions[0].top, positions[0].top, positions[0].top]);
    expect(positions.map(({ left }) => left)).toEqual([...positions.map(({ left }) => left)].sort((a, b) => a - b));
  } else {
    expect(positions.map(({ left }) => left)).toEqual([positions[0].left, positions[0].left, positions[0].left, positions[0].left]);
    expect(positions.map(({ top }) => top)).toEqual([...positions.map(({ top }) => top)].sort((a, b) => a - b));
  }
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
  await expect(hero.getByRole('link', { name: 'Fellows Directory' })).toBeVisible();

  const band = page.locator('[data-home-band]');
  await expect(band).toContainText('EHF - The Organisation');
  await expect(band).toContainText('The Fellowship');
  await expect(band).toContainText('Talented and connected innovators have built deep connections with New Zealand communities, businesses, and innovation ecosystem, creating a positive global impact.');
  await expect(band.locator('p')).toHaveCount(2);
  await expect(page.locator('.legacy-section, .impact-callout, .home-stats')).toHaveCount(0);
});

test('the archive has only a semantic hidden heading', async ({ page }) => {
  await page.goto('/read');
  await expect(page.locator('.read-page > h1')).toHaveClass(/visually-hidden/);
});

test('the generated article includes its decorative author avatar', async ({ page }) => {
  await page.goto('/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  const avatar = page.locator('img[src="/assets/images/article/author-avatar.webp"]');
  await expect(avatar).toHaveCount(1);
  await expect(avatar).toHaveAttribute('alt', '');
});
