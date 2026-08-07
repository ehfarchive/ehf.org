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
