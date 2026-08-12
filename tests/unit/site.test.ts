import { expect, test } from 'vitest';
import { footerNavigation, primaryNavigation } from '../../src/data/site';

type SiteDataItem = {
  label: string;
  kind: string;
  href?: string;
  children?: readonly SiteDataItem[];
};

function flattenNavigation(items: readonly SiteDataItem[]): SiteDataItem[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavigation(item.children) : [])]);
}

test('shared navigation has no external destination on the EHF source host', () => {
  const forbiddenDestinations = [...flattenNavigation(primaryNavigation), ...flattenNavigation(footerNavigation)]
    .flatMap((item) => item.kind === 'external' && item.href && new URL(item.href).hostname === 'www.ehf.org' ? [item.href] : []);

  expect(forbiddenDestinations).toEqual([]);
});

test('Impact Snapshots is absent from shared navigation', () => {
  expect(flattenNavigation(primaryNavigation).map((item) => item.label)).not.toContain('Impact Snapshots');
});

test('footer keeps Closure Statement as ordered non-link text', () => {
  expect(footerNavigation.map((item) => item.label)).toEqual([
    'About',
    'Impact',
    'Archive',
    'Closure Statement',
    'Privacy'
  ]);
  expect(footerNavigation[3]).toEqual({ label: 'Closure Statement', kind: 'text' });
});
