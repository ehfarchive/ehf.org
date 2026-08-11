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

test('desktop repeated keyboard activation collapses an open folder', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^impact$/i });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: /impact submenu/i })).toBeHidden();
});

test('desktop submenu pointer state is truthful', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^about$/i });
  await trigger.hover();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeVisible();
});

test('mobile menu fixes the document at its previous scroll position and restores it when dismissed', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/privacy-policy');
  await page.evaluate(() => scrollTo(0, 700));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
  await trigger.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  await expect(page.locator('body')).toHaveCSS('top', '-700px');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeHidden();
  await expect(page.locator('body')).toHaveCSS('position', 'static');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(700);
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

test('Impact folder exposes only approved destinations on a bare right-aligned submenu', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const impact = page.locator('[data-nav-item="impact"]');
  const trigger = impact.getByRole('button', { name: 'Impact', exact: true });
  const submenu = impact.locator('[data-desktop-submenu]');

  await trigger.hover();
  await expect(submenu).toBeVisible();
  await expect(submenu.getByRole('link')).toHaveText(['Read and Watch', 'EHF Community Collective']);
  await expect(submenu.getByRole('link', { name: /EHF Fellows Articles|Fellow Directory/i })).toHaveCount(0);
  expect(await submenu.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      borderRadius: styles.borderRadius,
      boxShadow: styles.boxShadow,
      textAlign: getComputedStyle(element.querySelector('ul')!).textAlign
    };
  })).toEqual({
    backgroundColor: 'rgba(0, 0, 0, 0)',
    borderRadius: '0px',
    boxShadow: 'none',
    textAlign: 'right'
  });
});

test('mobile modal traps focus and makes parent controls inert in child panels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /site navigation/i });
  const close = dialog.getByRole('button', { name: 'Close menu', exact: true });
  const brand = dialog.getByRole('link', { name: 'Edmund Hillary Fellowship', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(brand).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await dialog.getByRole('button', { name: /^about$/i }).click();
  await expect(dialog.locator('[data-mobile-root]')).toHaveAttribute('inert', '');
  const back = dialog.getByRole('button', { name: 'Back', exact: true });
  await expect(back).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  await back.click();
  const about = dialog.locator('[data-mobile-root] [data-mobile-folder-open="about"]');
  await expect(about).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.locator('[data-mobile-root] [data-mobile-folder-open="impact"]')).toBeFocused();
});

test('mobile child panels include the home brand once in the modal keyboard cycle', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /site navigation/i });
  const close = dialog.getByRole('button', { name: 'Close menu', exact: true });
  const brand = dialog.getByRole('link', { name: 'Edmund Hillary Fellowship', exact: true });

  await expect(brand).toHaveCount(1);
  for (const label of ['About', 'Impact']) {
    await dialog.getByRole('button', { name: label, exact: true }).click();
    const panel = dialog.locator(`[data-mobile-folder="${label.toLowerCase()}"]`);
    const back = panel.getByRole('button', { name: 'Back', exact: true });
    const links = panel.getByRole('link');

    await expect(dialog.locator('.mobile-menu__brand')).toBeVisible();
    await expect(back).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(brand).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(back).toBeFocused();
    for (let index = 0; index < await links.count(); index += 1) await page.keyboard.press('Tab');
    await expect(links.last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(brand).toBeFocused();

    await back.click();
  }
});

test('same-task child open and Back leaves only the root panel active', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /site navigation/i });
  await dialog.evaluate(async (element) => {
    (element.querySelector<HTMLElement>('[data-mobile-folder-open="about"]'))?.click();
    (element.querySelector<HTMLElement>('[data-mobile-folder="about"] [data-mobile-folder-back]'))?.click();
    const frame = Promise.withResolvers<void>();
    requestAnimationFrame(() => frame.resolve());
    await frame.promise;
  });
  const root = dialog.locator('[data-mobile-root]');
  const child = dialog.locator('[data-mobile-folder="about"]');
  await expect(root).not.toHaveAttribute('inert', '');
  await expect(root).not.toHaveClass(/is-shifted/);
  await expect(child).toBeHidden();
  await expect(child).not.toHaveClass(/is-active/);
  await expect(dialog.locator('[data-mobile-folder-open="about"]')).toBeFocused();
});

test('mobile dialog covers the captured viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  expect(await page.getByRole('dialog', { name: /site navigation/i }).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight
    };
  })).toEqual({ left: 0, top: 0, width: 390, height: 844, viewportWidth: 390, viewportHeight: 844 });
});

test('the 320px mobile header has no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile shell contract');
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await expect(page.locator('.site-header')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mobile controls retain source icon paint and accessible labels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile icon contract');
  await page.goto('/');

  const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
  const triggerIcon = trigger.locator('svg');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAttribute('aria-controls', 'site-navigation-dialog');
  await expect(triggerIcon).toHaveAttribute('aria-hidden', 'true');
  await expect(triggerIcon).toHaveAttribute('viewBox', '0 0 35 12');
  expect(await triggerIcon.locator('line').evaluateAll((lines) => lines.map((line) => ({
    y1: line.getAttribute('y1'),
    y2: line.getAttribute('y2'),
    strokeWidth: line.getAttribute('stroke-width')
  })))).toEqual([
    { y1: '0.5', y2: '0.5', strokeWidth: '1' },
    { y1: '11.5', y2: '11.5', strokeWidth: '1' }
  ]);
  expect(await triggerIcon.evaluate((icon) => {
    const rect = icon.getBoundingClientRect();
    return { color: getComputedStyle(icon).color, width: rect.width, height: rect.height };
  })).toEqual({ color: 'rgb(39, 36, 46)', width: 35, height: 12 });

  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const dialog = page.getByRole('dialog', { name: /site navigation/i });
  const close = dialog.getByRole('button', { name: 'Close menu', exact: true });
  const closeIcon = close.locator('svg');
  await expect(closeIcon).toHaveAttribute('aria-hidden', 'true');
  await expect(closeIcon).toHaveAttribute('viewBox', '0 0 21 21');
  expect(await closeIcon.locator('line').evaluateAll((lines) => lines.map((line) => line.getAttribute('stroke-width')))).toEqual(['1', '1']);
  expect(await close.evaluate((control) => {
    const rect = control.getBoundingClientRect();
    return { color: getComputedStyle(control).color, width: rect.width, height: rect.height };
  })).toEqual({ color: 'rgb(39, 36, 46)', width: 47, height: 37 });

  const disclosure = dialog.locator('[data-mobile-folder-open]').first().locator('.mobile-menu__chevron');
  await expect(disclosure).toHaveAttribute('aria-hidden', 'true');
  const disclosurePaint = await disclosure.evaluate((icon) => {
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
  });
  expect(disclosurePaint.backgroundColor).toBe('rgb(39, 36, 46)');
  expect(disclosurePaint.borderBottomWidth).toBe('0px');
  expect(disclosurePaint.borderRightWidth).toBe('0px');
  expect(disclosurePaint.maskImage).not.toBe('none');
  expect(disclosurePaint.width).toBeCloseTo(33.14, 1);
  expect(disclosurePaint.height).toBeCloseTo(33.14, 1);

  await close.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('desktop folders close on outside pointer interaction', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: /^about$/i });
  await trigger.hover();
  await page.mouse.click(720, 500);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeHidden();
});

test('the shared shell has a single described main landmark without directory navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop shell contract');
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
  await expect(page.locator('header[role="banner"]')).toHaveCount(1);
  await expect(page.locator('main#main-content')).toHaveCount(1);
  await expect(page.locator('footer[role="contentinfo"]')).toHaveCount(1);
  await expect(page.locator('header a[href*="fellow-directory"], footer a[href*="fellow-directory"]')).toHaveCount(0);
});

test('newsletter is display-only and prevents a real submission without a request, navigation, or success state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop newsletter contract');
  await page.goto('/');
  const requests: string[] = [];
  const navigations: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  const form = page.locator('[data-newsletter-form]');
  await expect(form).toBeVisible();
  const input = form.getByRole('textbox', { name: /email/i });
  const subscribe = form.getByRole('button', { name: /subscribe/i });
  await expect(input).toBeDisabled();
  await expect(input).toHaveAttribute('aria-describedby', 'newsletter-availability');
  await expect(subscribe).toBeDisabled();
  await expect(form).toContainText(/not available/i);
  await expect(form.locator('[data-newsletter-success]')).toHaveCount(0);
  expect(await form.evaluate((element) => new Promise<boolean>((resolve) => {
    const formElement = element as HTMLFormElement;
    formElement.addEventListener('submit', (event) => resolve(event.defaultPrevented), { once: true });
    formElement.requestSubmit();
  }))).toBe(true);
  await page.waitForTimeout(100);
  expect(requests).toEqual([]);
  expect(navigations).toEqual([]);
  await expect(page).toHaveURL('/');
  await expect(form.locator('[data-newsletter-success]')).toHaveCount(0);
});

test('all rendered shell images resolve from local assets', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop asset contract');
  await page.goto('/');
  const images = await page.locator('img').evaluateAll((nodes) => (nodes as HTMLImageElement[]).map((image) => image.currentSrc));
  expect(images).not.toEqual([]);
  expect(images.every((src) => new URL(src).pathname.startsWith('/assets/'))).toBe(true);
});

test('a desktop pointer click keeps the selected folder open', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'About', exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeVisible();
});

test('desktop repeated pointer activation collapses an open folder', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'About', exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: /about submenu/i })).toBeHidden();
});

test('mobile child panels retain the close control in the viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  const close = page.getByRole('button', { name: 'Close menu', exact: true });
  await expect(close).toBeVisible();
  expect(await close.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
  })).toBe(true);
});

test('mobile submenu keeps the source-observed home brand and close dismissal controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open menu', exact: true });
  const dialog = page.getByRole('dialog', { name: /site navigation/i });

  for (const [label, dismiss] of [['About', 'close'], ['Impact', 'escape']] as const) {
    await trigger.click();
    await dialog.getByRole('button', { name: label, exact: true }).click();

    await expect(dialog.getByRole('link', { name: 'Edmund Hillary Fellowship', exact: true })).toHaveAttribute('href', '/');
    await expect(dialog.getByRole('button', { name: 'Close menu', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
    await expect(dialog.getByRole('link', { name: /fellow directory|impact snapshots|ehf fellows articles/i })).toHaveCount(0);
    await expect(dialog.locator('a[href="/news#fellows"], a[href="/news#impact-snapshots"]')).toHaveCount(0);

    if (dismiss === 'close') {
      await dialog.getByRole('button', { name: 'Close menu', exact: true }).click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(dialog).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
    await expect(trigger).toBeFocused();
  }
});

test('Impact retains every manifest-backed submenu destination', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop menu contract');
  await page.goto('/');
  await page.getByRole('button', { name: 'Impact', exact: true }).hover();
  const submenu = page.getByRole('navigation', { name: /impact submenu/i });
  await expect(submenu.getByRole('link', { name: 'EHF Community Collective', exact: true })).toHaveAttribute('href', '/communitycollective');
});
