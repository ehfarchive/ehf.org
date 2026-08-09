import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import { resolveLocalAsset, validateAssetManifestRecord } from '../../src/lib/assets';
import { destinationForRecord, downloadApprovedAssets, readBoundedResponse } from '../../scripts/download-assets.mjs';
import {
  hasForbiddenEmbeddedAssetReference,
  hasForbiddenRuntimeAssetReference,
  validateAssetRecord,
  verifyManifest,
  verifyRuntimeReferences
} from '../../scripts/verify-local-assets.mjs';

const hash = 'a'.repeat(64);
const localAsset = {
  id: 'home-hero',
  classification: 'local',
  localPath: '/assets/images/home-hero.webp',
  sha256: hash,
  bytes: 1,
  mediaType: 'image/webp',
  routeUses: ['/'],
  externalUrl: null
} as const;

function fixtureAsset(bytes = Buffer.from('asset')) {
  const publicAssetsRoot = mkdtempSync(join(tmpdir(), 'ehf-assets-'));
  const localPath = '/assets/images/home-hero.webp';
  const file = join(publicAssetsRoot, 'images/home-hero.webp');
  mkdirSync(join(publicAssetsRoot, 'images'), { recursive: true });
  writeFileSync(file, bytes);
  return {
    publicAssetsRoot,
    record: {
      ...localAsset,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex')
    }
  };
}

test('resolves a valid regular manifest-backed local asset to its safe runtime path', () => {
  const { publicAssetsRoot, record } = fixtureAsset();
  try {
    expect(resolveLocalAsset('home-hero', { schemaVersion: 2, assets: [record] }, publicAssetsRoot)).toBe(record.localPath);
  } finally {
    rmSync(publicAssetsRoot, { recursive: true, force: true });
  }
});

test('rejects missing, byte-mismatched, and hash-mismatched manifest files', () => {
  const { publicAssetsRoot, record } = fixtureAsset();
  try {
    expect(() => resolveLocalAsset('home-hero', { schemaVersion: 2, assets: [{ ...record, localPath: '/assets/images/missing.webp' }] }, publicAssetsRoot))
      .toThrow('missing local asset');
    expect(() => resolveLocalAsset('home-hero', { schemaVersion: 2, assets: [{ ...record, bytes: record.bytes + 1 }] }, publicAssetsRoot))
      .toThrow('byte count mismatch');
    expect(() => resolveLocalAsset('home-hero', { schemaVersion: 2, assets: [{ ...record, sha256: hash }] }, publicAssetsRoot))
      .toThrow('SHA-256 mismatch');
  } finally {
    rmSync(publicAssetsRoot, { recursive: true, force: true });
  }
});

test('rejects an absent local asset id', () => {
  expect(() => resolveLocalAsset('missing', { schemaVersion: 2, assets: [localAsset] }))
    .toThrow('missing local asset: missing');
});

test('rejects an external record where a local asset is required', () => {
  expect(() => resolveLocalAsset('donate', {
    schemaVersion: 2,
    assets: [{
      id: 'donate',
      classification: 'external',
      localPath: null,
      sha256: null,
      bytes: null,
      mediaType: null,
      routeUses: ['/'],
      externalUrl: 'https://donate.example.org/form'
    }]
  })).toThrow('is external');
});

test('rejects a local record with an unsafe path, invalid hash, bytes, or route uses', () => {
  expect(validateAssetManifestRecord({
    ...localAsset,
    localPath: '/assets/../escape.webp',
    sha256: 'bad',
    bytes: 0,
    routeUses: []
  })).toEqual(expect.arrayContaining([
    'local asset needs a safe /assets/ localPath',
    'local asset needs a 64-character lowercase SHA-256',
    'local asset needs positive safe integer bytes',
    'asset needs non-empty routeUses'
  ]));
});

test('rejects duplicate asset ids with mismatched records', () => {
  expect(() => resolveLocalAsset('home-hero', {
    schemaVersion: 2,
    assets: [localAsset, { ...localAsset, localPath: '/assets/images/other.webp' }]
  })).toThrow('duplicate asset id: home-hero');
});

test('rejects a Squarespace runtime URL', () => {
  expect(hasForbiddenRuntimeAssetReference('https://static1.squarespace.com/media/a.png')).toBe(true);
});

test('permits an external Squarespace document link but rejects an embedded asset URL', () => {
  expect(hasForbiddenEmbeddedAssetReference('[Download](https://static1.squarespace.com/media/report.pdf)')).toBe(false);
  expect(hasForbiddenEmbeddedAssetReference('![Report](https://static1.squarespace.com/media/report.png)')).toBe(true);
});

test('accepts a complete local asset record', () => {
  expect(validateAssetRecord(localAsset)).toEqual([]);
});

test('accepts a strict versioned manifest envelope', () => {
  expect(verifyManifest({ schemaVersion: 2, assets: [] })).toEqual([]);
});

test('accepts an exact existing asset manifest for download', async () => {
  await expect(downloadApprovedAssets({ schemaVersion: 2, assets: [] })).resolves.toBeUndefined();
});

test('rejects a downloader path outside public assets', () => {
  expect(() => destinationForRecord({ ...localAsset, localPath: '/assets/../../escape.webp' }))
    .toThrow('safe /assets/ localPath');
});

test('rejects malformed external asset records', () => {
  expect(verifyManifest({
    schemaVersion: 2,
    assets: [{ ...localAsset, classification: 'external', externalUrl: 'http://not-secure.test' }]
  })).toContain('manifest[0]: external asset must not define local fields');
});

test('rejects forbidden source and Squarespace hosts in every runtime text context while skipping binaries', () => {
  const probes = [
    ['public/runtime-asset-verifier-test.css', 'background: url("https://static1.squarespace.com/media/test.png")'],
    ['public/runtime-asset-verifier-test.html', '<a href="https://www.ehf.org/events">Events</a><img src="https://www.ehf.org/image.png"><source srcset="https://orb-parrotfish-n735.squarespace.com/image.png 2x"><script src="https://static1.squarespace.com/script.js"></script>'],
    ['public/runtime-asset-verifier-test.js', 'const asset = "https://static1.squarespace.com/runtime.js";'],
    ['public/runtime-asset-verifier-test.json', '{"href":"https://www.ehf.org/runtime.json"}'],
    ['public/runtime-asset-verifier-test.png', Buffer.from('https://www.ehf.org/binary.png')]
  ] as const;
  for (const [path, content] of probes) writeFileSync(resolve(path), content);
  try {
    expect(verifyRuntimeReferences({ schemaVersion: 2, assets: [] })).toEqual(expect.arrayContaining([
      'forbidden runtime asset domain in public/runtime-asset-verifier-test.css',
      'forbidden runtime asset domain in public/runtime-asset-verifier-test.html',
      'forbidden runtime asset domain in public/runtime-asset-verifier-test.js',
      'forbidden runtime asset domain in public/runtime-asset-verifier-test.json'
    ]));
    expect(verifyRuntimeReferences({ schemaVersion: 2, assets: [] })).not.toContain('forbidden runtime asset domain in public/runtime-asset-verifier-test.png');
  } finally {
    for (const [path] of probes) unlinkSync(resolve(path));
  }
});
test('rejects a forbidden host in a non-leading srcset candidate', () => {
  const path = 'public/runtime-asset-verifier-srcset-test.html';
  writeFileSync(resolve(path), '<source srcset=" /assets/local.webp 1x , https://www.ehf.org/remote.webp 2x ">');
  try {
    expect(verifyRuntimeReferences({ schemaVersion: 2, assets: [] }))
      .toContain('forbidden runtime asset domain in public/runtime-asset-verifier-srcset-test.html');
  } finally {
    unlinkSync(resolve(path));
  }
});


test('rejects declared and streamed asset responses over the byte ceiling', async () => {
  await expect(readBoundedResponse(new Response('12345', { headers: { 'content-length': '5' } }), 4)).rejects.toThrow('Content-Length exceeds limit');
  await expect(readBoundedResponse(new Response('12345'), 4)).rejects.toThrow('download exceeds limit');
});