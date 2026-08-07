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

test('the archive uses masonry on desktop and a single source-order stack on mobile', async ({ page }, testInfo) => {
  await page.goto('/read');

  const layout = await page.locator('[data-read-masonry]').evaluate((element) => getComputedStyle(element).columnCount);
  expect(layout).toBe(testInfo.project.name === 'desktop' ? '4' : '1');
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
