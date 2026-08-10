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

    const form = page.locator('main form');
    await expect(form).toHaveCount(1);
    await expect(form).not.toHaveAttribute('action');
    await expect(form).not.toHaveAttribute('method');
    await expect(form.locator('[required]')).toHaveCount(0);
    await expect(form.locator('input, textarea')).toHaveCount(formContract.fields.length);

    for (const [index, field] of formContract.fields.entries()) {
      const control = form.locator('input, textarea').nth(index);
      await expect(form.getByLabel(field.label, { exact: true })).toHaveAttribute('id', field.id);
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
    await form.getByRole('button', { name: formContract.submitLabel, exact: true }).click();
    await expect(form.getByText(/success|thank you|sent/i)).toHaveCount(0);
    expect(requests).toEqual([]);

    for (const field of formContract.fields) {
      const control = page.locator(`#${field.id}`);
      if (field.type === 'checkbox') await expect(control).toBeChecked();
      else await expect(control).toHaveValue(String(field.filledValue));
    }
  });
}
