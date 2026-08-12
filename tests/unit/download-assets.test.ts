import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, test, vi } from 'vitest';
import { approvedAssetCandidates, discoverApprovedDownloads } from '../../scripts/download-assets.mjs';

const origin = 'https://www.ehf.org';

type LocalAssetRecord = {
  id: string;
  classification: 'local';
  localPath: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  routeUses: string[];
  externalUrl: null;
};

const downloadRoot = mkdtempSync(join(tmpdir(), 'ehf-download-'));
const fixtureDestination = (record: { localPath: string }) =>
  join(downloadRoot, record.localPath.slice('/assets/'.length));

afterAll(() => rmSync(downloadRoot, { recursive: true, force: true }));

function localRecord(bytes: Buffer): LocalAssetRecord {
  return {
    id: 'asset-example',
    classification: 'local',
    localPath: '/assets/images/content/example.jpg',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    mediaType: 'image/jpeg',
    routeUses: ['/read/example'],
    externalUrl: null
  };
}

test('keeps rediscovery candidates to approved image and report PDF assets', () => {
  const html = `
    <img src="https://images.squarespace-cdn.com/content/hero.jpg">
    <img src="https://images.squarespace-cdn.com/content/hero.jpg">
    <a href="/read/ordinary-page">Read more</a>
    <a href="https://example.org/unrelated.pdf">External report</a>
    <a href="https://www.ehf.org/s/annual-report.pdf">Annual report</a>
  `;

  expect(approvedAssetCandidates(html, origin)).toEqual([
    'https://images.squarespace-cdn.com/content/hero.jpg',
    'https://www.ehf.org/s/annual-report.pdf'
  ]);
  expect(() => approvedAssetCandidates(html, origin, 1)).toThrow('rediscovery candidate limit exceeded');
});

test('rejects an off-scope redirect before requesting its target', async () => {
  const asset = Buffer.from('approved asset');
  const fetcher = vi.fn(async (url: URL | string) => {
    const value = String(url);
    if (value === 'https://www.ehf.org/read/example') return new Response('<img src="https://images.squarespace-cdn.com/content/hero.jpg">');
    if (value === 'https://images.squarespace-cdn.com/content/hero.jpg') {
      return new Response(null, { status: 302, headers: { location: 'https://example.org/stolen.jpg' } });
    }
    throw new Error(`unexpected request: ${value}`);
  });

  await expect(discoverApprovedDownloads(
    { schemaVersion: 2, assets: [localRecord(asset)] },
    origin,
    [{ path: '/read/example', kind: 'included' }],
    fetcher,
    fixtureDestination
  ))
    .rejects.toThrow('unapproved asset URL');
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher).not.toHaveBeenCalledWith('https://example.org/stolen.jpg', expect.anything());
});

test('follows bounded approved source and asset redirects manually', async () => {
  const asset = Buffer.from('approved asset');
  const fetcher = vi.fn(async (url: URL | string) => {
    const value = String(url);
    if (value === 'https://www.ehf.org/read/example') {
      return new Response(null, { status: 302, headers: { location: 'https://orb-parrotfish-n735.squarespace.com/read/example' } });
    }
    if (value === 'https://orb-parrotfish-n735.squarespace.com/read/example') {
      return new Response('<img src="https://images.squarespace-cdn.com/content/hero.jpg">');
    }
    if (value === 'https://images.squarespace-cdn.com/content/hero.jpg') {
      return new Response(null, { status: 301, headers: { location: '/content/final.jpg' } });
    }
    if (value === 'https://images.squarespace-cdn.com/content/final.jpg') return new Response(asset);
    throw new Error(`unexpected request: ${value}`);
  });

  await expect(discoverApprovedDownloads(
    { schemaVersion: 2, assets: [localRecord(asset)] },
    origin,
    [{ path: '/read/example', kind: 'included' }],
    fetcher,
    fixtureDestination
  ))
    .resolves.toBeUndefined();
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(readFileSync(fixtureDestination(localRecord(asset)))).toEqual(asset);
});

test('does not fetch unrelated links and fails when approved assets remain unresolved', async () => {
  const asset = Buffer.from('approved asset');
  const fetcher = vi.fn(async (url: URL | string) => {
    const value = String(url);
    if (value === 'https://www.ehf.org/read/example') return new Response('<img src="https://images.squarespace-cdn.com/content/hero.jpg"><a href="https://example.org/broken">Unrelated</a>');
    if (value === 'https://images.squarespace-cdn.com/content/hero.jpg') return new Response(asset);
    throw new Error(`unexpected request: ${value}`);
  });

  await expect(discoverApprovedDownloads(
    { schemaVersion: 2, assets: [localRecord(Buffer.from('different'))] },
    origin,
    [{ path: '/read/example', kind: 'included' }],
    fetcher,
    fixtureDestination
  ))
    .rejects.toThrow('could not rediscover approved assets: asset-example');
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher).not.toHaveBeenCalledWith('https://example.org/broken', expect.anything());
});
