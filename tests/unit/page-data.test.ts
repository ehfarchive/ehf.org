import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import contentManifest from '../../source-evidence/content-manifest.json';
import { loadPageData, loadPageSections, validateContentManifest } from '../../src/lib/page-data';
import type { RouteManifest } from '../../src/lib/route-manifest';


const hash = 'a'.repeat(64);

const manifest = {
  schemaVersion: 1,
  content: [
    {
      route: '/about-ehf',
      template: 'institutional',
      localInput: 'src/content/pages/institutional/about-ehf.json',
      contentHash: hash
    },
    {
      route: '/',
      template: 'homepage',
      localInput: null,
      contentHash: null
    }
  ]
} as const;

const routes: RouteManifest = {
  schemaVersion: 1,
  routes: [
    { path: '/', kind: 'included', family: 'homepage' },
    { path: '/about-ehf', kind: 'included', family: 'institutional' },
    { path: '/excluded', kind: 'excluded', reason: 'not in scope' }
  ]
};

test('loads the single typed local input for its included route and requested template', () => {
  expect(loadPageData('/about-ehf', 'institutional', manifest, routes)).toEqual(manifest.content[0]);
});

test('rejects excluded routes and template disagreements', () => {
  expect(() => loadPageData('/excluded', 'institutional', manifest, routes)).toThrow('route is not included');
  expect(() => loadPageData('/about-ehf', 'legal', manifest, routes)).toThrow('requested template does not match route manifest');
  expect(() => loadPageData('/about-ehf', 'institutional', { ...manifest, content: [{ ...manifest.content[0], template: 'legal' }] }, routes))
    .toThrow('content template does not match route manifest');
});

test('rejects an absent route mapping', () => {
  expect(() => loadPageData('/missing', 'institutional', manifest, routes)).toThrow('route is not included');
});

test('rejects a generated route without a local input', () => {
  expect(() => loadPageData('/', 'homepage', manifest, routes)).toThrow('does not have a typed local input');
});

test('rejects multiple records for one route', () => {
  expect(validateContentManifest({
    schemaVersion: 1,
    content: [manifest.content[0], { ...manifest.content[0], template: 'legal' }]
  })).toContain('content manifest has duplicate route: /about-ehf');
});

test('rejects a local input with a mismatched content hash', () => {
  expect(validateContentManifest({
    schemaVersion: 1,
    content: [{ ...manifest.content[0], contentHash: 'not-a-hash' }]
  })).toContain('content[0] needs a 64-character lowercase SHA-256 contentHash');
});

test('accepts the checked-in Impact and Watch content contracts', () => {
  expect(validateContentManifest(contentManifest)).toEqual([]);
  expect(contentManifest.content.filter((record) => record.template === 'watch-article')).toHaveLength(88);
});

test('migrates each raw body and link once at the PageSection loader boundary', () => {
  const raw = {
    route: '/about-ehf',
    title: 'About EHF',
    description: 'Description',
    heading: 'About EHF',
    body: ['First body', 'Second body'],
    heroImage: null,
    heroAlt: null,
    links: [{ label: 'Read more', href: 'https://example.test' }]
  };

  expect(loadPageSections(raw, '/about-ehf')).toEqual([
    { body: 'First body' },
    { body: 'Second body', links: [{ label: 'Read more', href: 'https://example.test' }] }
  ]);
});


test('all eight institutional and legal inputs retain every body and link exactly once through PageSection migration', () => {
  const records = contentManifest.content.filter((record) => record.template === 'institutional' || record.template === 'legal');
  expect(records).toHaveLength(8);
  for (const record of records) {
    const raw = JSON.parse(readFileSync(resolve(process.cwd(), record.localInput!), 'utf8')) as {
      route: string; body: string[]; links: { label: string; href: string }[];
    };
    const sections = loadPageSections(raw, record.route);
    expect(sections.map((section) => section.body), record.route).toEqual(raw.body);
    expect(sections.flatMap((section) => section.links ?? []), record.route).toEqual(raw.links);
  }
});