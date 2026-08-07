import { expect, test } from '@playwright/test';

test('desktop Impact dropdown opens by keyboard and closes with Escape', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^impact$/i });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: /impact submenu/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: /impact submenu/i })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('desktop submenu pointer state is truthful', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^about$/i });
  await trigger.hover();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeVisible();
});

test('mobile menu locks page scroll and restores focus when dismissed', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/menu-open/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(trigger).toBeFocused();
});

test('desktop pointer-open dropdown closes with Escape and restores trigger focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^about$/i });
  await trigger.hover();
  await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('mobile viewport hides the desktop navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await expect(page.locator('.desktop-nav')).toBeHidden();
});

test('desktop shell spans the viewport and registers local latin-ext faces', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop typography contract');
  await page.goto('/');
  const shell = await page.evaluate(() => {
    const fonts = [...document.styleSheets].flatMap((sheet) => {
      try {
        return [...sheet.cssRules]
          .filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule)
          .map((rule) => ({
            family: rule.style.fontFamily,
            weight: rule.style.fontWeight,
            range: rule.style.getPropertyValue('unicode-range'),
            source: rule.style.getPropertyValue('src')
          }));
      } catch {
        return [];
      }
    });
    const header = document.querySelector('.site-header')?.getBoundingClientRect();
    return { fonts, header: header && { left: header.left, width: header.width }, viewportWidth: innerWidth };
  });

  expect(shell.header).toEqual({ left: 0, width: shell.viewportWidth });
  expect(shell.fonts).toEqual(expect.arrayContaining([
    expect.objectContaining({ family: 'Roboto', weight: '700', range: expect.stringContaining('U+100'), source: expect.stringContaining('roboto-700-latin-ext') }),
    expect.objectContaining({ family: 'Roboto', weight: '900', range: expect.stringContaining('U+100'), source: expect.stringContaining('roboto-700-latin-ext') }),
    expect.objectContaining({ family: 'Merriweather', weight: '300', range: expect.stringContaining('U+100'), source: expect.stringContaining('merriweather-300-latin-ext') })
  ]));
});

test('desktop pointer can enter a submenu and follow its source destination', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^impact$/i });
  const submenu = page.getByRole('navigation', { name: /impact submenu/i });
  await trigger.hover();
  await submenu.getByRole('link', { name: 'Read and Watch' }).hover();
  await expect(submenu).toBeVisible();
  await submenu.getByRole('link', { name: 'Read and Watch' }).click();
  await expect(page).toHaveURL(/\/impact-in-action$/);
});

test('mobile modal traps focus and makes parent controls inert in child panels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /site navigation/i });
  const close = dialog.getByRole('button', { name: 'Close menu', exact: true });
  const directory = dialog.locator('[data-mobile-root] .button--directory');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(directory).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await dialog.getByRole('button', { name: /^about$/i }).click();
  await expect(dialog.locator('[data-mobile-root]')).toHaveAttribute('inert', '');
  const back = dialog.getByRole('button', { name: 'Back', exact: true });
  await expect(back).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
});

test('mobile dialog covers the captured viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  expect(await page.getByRole('dialog', { name: /site navigation/i }).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
  })).toEqual({ left: 0, top: 0, width: 390, height: 844, viewportWidth: 390, viewportHeight: 844 });
});

test('the 320px mobile header has no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile shell contract');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(page.locator('.site-header')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
