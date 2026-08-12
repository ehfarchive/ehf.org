import { expect, test, type Page } from '@playwright/test';
import sourceContract from '../../source-evidence/source-contract.json';

type Field = {
  id: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'checkbox';
  autocomplete?: string;
  filledValue: string | boolean;
};
type FormRoute = {
  route: string;
  heading: string;
  submitLabel: string;
  fields: Field[];
  captures: { viewport: 'desktop' | 'mobile'; defaultState: 'default'; filledState: 'filled'; png: string; json: string }[];
};

const contract = sourceContract.ticket10ContactForms as { routes: FormRoute[]; prohibited: { routes: string[]; controls: string[] } };
const expectedRoutes = [
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

async function fillCapturedValues(page: Page, fields: readonly Field[]) {
  for (const field of fields) {
    const control = page.locator(`#${field.id}`);
    if (field.type === 'checkbox') {
      await control.check();
    } else {
      await control.fill(String(field.filledValue));
    }
  }
}

test('Ticket 10 source contract has exactly nine routes and eighteen default-filled source capture pairs', () => {
  expect(contract.routes.map((form) => form.route)).toEqual(expectedRoutes);
  expect(contract.routes.flatMap((form) => form.captures)).toHaveLength(18);
  for (const form of contract.routes) {
    expect(form.captures.map((capture) => capture.viewport)).toEqual(['desktop', 'mobile']);
    expect(form.captures.every((capture) => capture.defaultState === 'default' && capture.filledState === 'filled')).toBe(true);
  }
});

test('Ticket 10 rejects the excluded donate path and every forbidden external form control', async ({ page }) => {
  const response = await page.goto('/donate');
  expect(response?.status()).toBe(404);

  for (const form of contract.routes) {
    await page.goto(form.route);
    const main = page.getByRole('main');
    await expect(main.locator('a[href^="http"], a[href*="donat" i], iframe, video, [data-recaptcha], [name*="honeypot" i]')).toHaveCount(0);
  }
});

for (const formContract of contract.routes) {
  test(`Ticket 10 ${formContract.route} retains captured values without sending`, async ({ page }) => {

    const response = await page.goto(formContract.route);
    expect(response?.ok(), formContract.route).toBe(true);
    await expect(page.getByRole('heading', { name: formContract.heading, exact: true })).toBeVisible();
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest() || request.method() !== 'GET') requests.push(request.url());
    });

    const controls = page.locator('main [data-display-only-controls]');
    await expect(page.locator('main form')).toHaveCount(0);
    await expect(controls).toHaveCount(1);
    await expect(controls).toHaveAttribute('role', 'group');
    await expect(controls.locator('[required]')).toHaveCount(0);
    await expect(controls.locator('input, textarea')).toHaveCount(formContract.fields.length);

    for (const [index, field] of formContract.fields.entries()) {
      const control = controls.locator('input, textarea').nth(index);
      await expect(controls.getByLabel(field.label, { exact: true })).toHaveAttribute('id', field.id);
      await expect(control).toHaveAttribute('id', field.id);
      if (field.type === 'textarea') {
        await expect(control).toHaveJSProperty('tagName', 'TEXTAREA');
      } else {
        await expect(control).toHaveAttribute('type', field.type);
      }
      if (field.autocomplete) await expect(control).toHaveAttribute('autocomplete', field.autocomplete);
      else await expect(control).not.toHaveAttribute('autocomplete');
      if (field.type === 'checkbox') await expect(control).not.toBeChecked();
      else await expect(control).toHaveValue('');
    }

    await fillCapturedValues(page, formContract.fields);
    const button = controls.getByRole('button', { name: formContract.submitLabel, exact: true });
    await expect(button).toHaveAttribute('type', 'button');
    await button.click();
    await expect(controls.getByText(/success|thank you|sent/i)).toHaveCount(0);
    expect(requests).toEqual([]);

    for (const field of formContract.fields) {
      const control = page.locator(`#${field.id}`);
      if (field.type === 'checkbox') await expect(control).toBeChecked();
      else await expect(control).toHaveValue(String(field.filledValue));
    }
  });
}

test('Ticket 10 display controls keep personal data local without JavaScript', async ({ browser }) => {
  const formContract = contract.routes.find((route) => route.route === '/contact-us');
  if (!formContract) throw new Error('missing contact-us source contract');
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  try {
    await page.goto(formContract.route);
    const controls = page.locator('[data-display-only-controls]');
    const navigationRequests: string[] = [];
    page.on('request', (request) => {
      if (request.isNavigationRequest() || request.method() !== 'GET') navigationRequests.push(request.url());
    });
    await expect(page.locator('form')).toHaveCount(0);
    await fillCapturedValues(page, formContract.fields);
    const before = page.url();
    await controls.getByRole('button', { name: formContract.submitLabel, exact: true }).click();
    await expect(page).toHaveURL(before);
    expect(navigationRequests).toEqual([]);
    await expect(page.locator('#first-name')).toHaveValue(String(formContract.fields[0].filledValue));
  } finally {
    await context.close();
  }
});


test('Ticket 10 renders the captured update-group semantics and source-form shared affordances', async ({ page }) => {
  await page.goto('/news-and-events-updates');
  const updates = page.getByRole('group', { name: 'What type of updates are you interested in? (required)', exact: true });
  await expect(updates).toBeVisible();
  await expect(updates.getByText("Please select one of the following options so that we can determine which type of updates you're interested in", { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privacy Policy', exact: true })).toHaveAttribute('href', '/privacy-policy');
  await expect(page.locator('.display-only-form__label-required').first()).toHaveText('(required)');

  await page.goto('/contact-us');
  await expect(page.getByRole('heading', { name: 'Contact Us', exact: true })).toHaveCSS('text-align', 'left');

  await page.goto('/donation-more-than-10k');
  await expect(page.getByText('Just fill out the below form and someone from our team will be in touch to discuss the options. Thank you for your ongoing support of EHF.', { exact: true })).toBeVisible();

  await expect(page.getByRole('heading', { name: 'Want to donate more than $10,000?', exact: true })).toHaveCSS('text-align', 'left');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByText('(c) Edmund Hillary Fellowship 2016 - 2026', { exact: true })).toBeVisible();
  await expect(footer.getByRole('link')).toHaveText(['About', 'Impact', 'Archive', 'Privacy']);

  const skipLink = page.getByRole('link', { name: 'Skip to Content', exact: true });
  await expect(skipLink).toHaveAttribute('href', '#main-content');
  await expect(skipLink).toHaveCSS('position', 'absolute');

  await skipLink.focus();
  await expect(skipLink).toHaveCSS('clip', 'auto');
});

test('Ticket 10 applies the captured type hierarchy across every route and viewport', async ({ page }) => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ] as const) {
    await page.setViewportSize(viewport);

    for (const formContract of contract.routes) {
      await page.goto(formContract.route);
      const heading = page.getByRole('heading', { name: formContract.heading, exact: true });
      await expect(heading).toHaveCSS('font-family', /Roboto/);
      const isMedia = formContract.route === '/contact-media';
      await expect(heading).toHaveCSS('letter-spacing', isMedia ? viewport.name === 'desktop' ? '-0.4992px' : '-0.39192px' : viewport.name === 'desktop' ? '-0.60288px' : '-0.42px');
      await expect(heading).toHaveCSS('font-size', isMedia ? viewport.name === 'desktop' ? '33.28px' : '26.128px' : viewport.name === 'desktop' ? '40.192px' : '28px');

      const controls = page.locator('main [data-display-only-controls]');
      await expect(controls).toHaveCSS('font-family', /Merriweather/);
      await expect(controls).toHaveCSS('font-size', viewport.name === 'desktop' ? '19.456px' : '18.0256px');
      await expect(controls.locator('legend').first()).toHaveCSS('font-size', viewport.name === 'desktop' ? '19.456px' : '18.0256px');
      await expect(controls.locator('.display-only-form__label-required').first()).toHaveCSS('font-size', '16px');
      await expect(controls.locator('input:not([type="checkbox"])').first()).toHaveCSS('font-family', /Merriweather/);
      await expect(controls.locator('input:not([type="checkbox"])').first()).toHaveCSS('font-size', viewport.name === 'desktop' ? '19.456px' : '18.0256px');
    }
  }
});

test('Ticket 10 keeps update helper, checkbox, and privacy text at their source form scale', async ({ page }, testInfo) => {
  await page.goto('/news-and-events-updates');
  const bodySize = testInfo.project.name === 'desktop' ? '19.456px' : '18.0256px';
  await expect(page.locator('.display-only-form__check-help')).toHaveCSS('font-size', '16px');
  await expect(page.locator('.display-only-form__check').first()).toHaveCSS('font-size', bodySize);
  await expect(page.locator('.display-only-form__privacy')).toHaveCSS('font-size', '16px');
});
