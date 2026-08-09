import { afterEach, expect, test } from 'vitest';
import { existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { destinationForRecord, downloadApprovedAssets } from '../../scripts/download-assets.mjs';
import {
  hasForbiddenRuntimeAssetReference,
  validateAssetRecord,
  verifyManifest
} from '../../scripts/verify-local-assets.mjs';

test('rejects a Squarespace runtime URL', () => {
  expect(hasForbiddenRuntimeAssetReference('https://static1.squarespace.com/media/a.png')).toBe(true);
});

test('accepts a complete approved local asset record', () => {
  expect(validateAssetRecord({
    sourceUrl: 'https://www.ehf.org/image.jpg',
    localPath: '/assets/image.jpg',
    sha256: 'a'.repeat(64),
    bytes: 1,
    permissionStatus: 'approved-local',
    attribution: 'EHF',
    routeUses: ['/'],
    retainedExternalUrl: null
  })).toEqual([]);
});

test('rejects a local asset record without explicit approval', () => {
  expect(validateAssetRecord({
    sourceUrl: 'https://www.ehf.org/image.jpg',
    localPath: '/assets/image.jpg',
    sha256: 'a'.repeat(64),
    bytes: 1,
    permissionStatus: 'blocked',
    attribution: 'EHF',
    routeUses: ['/'],
    retainedExternalUrl: null
  })).toContain('blocked asset must not have localPath or sha256');
});


test('rejects a downloader path outside public assets', () => {
  expect(() => destinationForRecord({
    sourceUrl: 'https://www.ehf.org/image.jpg',
    localPath: '/assets/../../escape.png',
    sha256: 'a'.repeat(64),
    bytes: 1,
    permissionStatus: 'approved-local',
    attribution: 'EHF',
    routeUses: ['/'],
    retainedExternalUrl: null
  })).toThrow(/public\/assets/);
});

test('accepts the versioned manifest envelope', () => {
  expect(verifyManifest({ schemaVersion: 1, assets: [] })).toEqual([]);
});

test('accepts the versioned manifest envelope for download', async () => {
  await expect(downloadApprovedAssets({ schemaVersion: 1, assets: [] })).resolves.toBeUndefined();
});

test('verifier rejects malformed external-only records', () => {
  expect(verifyManifest({
    schemaVersion: 1,
    assets: [{
      sourceUrl: 'https://www.ehf.org/report.pdf',
      localPath: '/assets/report.pdf',
      sha256: 'a'.repeat(64),
      bytes: 1,
      permissionStatus: 'external-only',
      attribution: 'EHF',
      routeUses: ['/23-annual-report'],
      retainedExternalUrl: null
    }]
  })).toContain('manifest[0]: external-only asset needs retainedExternalUrl');
});

test('verifier rejects malformed blocked records', () => {
  expect(verifyManifest({
    schemaVersion: 1,
    assets: [{
      sourceUrl: 'https://www.ehf.org/blocked.png',
      localPath: '/assets/blocked.png',
      sha256: 'a'.repeat(64),
      bytes: 1,
      permissionStatus: 'blocked',
      attribution: 'EHF',
      routeUses: ['/'],
      retainedExternalUrl: null
    }]
  })).toContain('manifest[0]: blocked asset must not have localPath or sha256');
});

const downloadTestPath = 'public/assets/test-download-never-write.bin';
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  rmSync(downloadTestPath, { force: true });
});

test('rejects non-HTTPS source URLs and missing byte counts', () => {
  const record = {
    sourceUrl: 'http://www.ehf.org/image.jpg',
    localPath: '/assets/test-download-never-write.bin',
    sha256: 'a'.repeat(64),
    permissionStatus: 'approved-local',
    attribution: 'EHF',
    routeUses: ['/'],
    retainedExternalUrl: null
  };
  expect(validateAssetRecord(record)).toEqual(expect.arrayContaining([
    'asset record needs valid HTTPS sourceUrl',
    'asset record needs a safe positive byte count'
  ]));
});

test('downloader rejects missing byte count before writing', async () => {
  globalThis.fetch = async () => new Response('abcd');
  await expect(downloadApprovedAssets({ assets: [{
    sourceUrl: 'https://www.ehf.org/image.jpg',
    localPath: '/assets/test-download-never-write.bin',
    sha256: createHash('sha256').update('abcd').digest('hex'),
    permissionStatus: 'approved-local',
    attribution: 'EHF',
    routeUses: ['/'],
    retainedExternalUrl: null
  }] })).rejects.toThrow('safe positive byte count');
  expect(existsSync(downloadTestPath)).toBe(false);
});

test('downloader rejects Content-Length mismatch before writing', async () => {
  globalThis.fetch = async () => new Response('abcd', { headers: { 'content-length': '5' } });
  await expect(downloadApprovedAssets({ assets: [{
    sourceUrl: 'https://www.ehf.org/image.jpg',
    localPath: '/assets/test-download-never-write.bin',
    sha256: createHash('sha256').update('abcd').digest('hex'),
    bytes: 4,
    permissionStatus: 'approved-local',
    attribution: 'EHF',
    routeUses: ['/'],
    retainedExternalUrl: null
  }] })).rejects.toThrow('Content-Length mismatch');
  expect(existsSync(downloadTestPath)).toBe(false);
});

test('downloader rejects oversized response streams before writing', async () => {
  globalThis.fetch = async () => new Response('abcde');
  await expect(downloadApprovedAssets({ assets: [{
    sourceUrl: 'https://www.ehf.org/image.jpg',
    localPath: '/assets/test-download-never-write.bin',
    sha256: createHash('sha256').update('abcde').digest('hex'),
    bytes: 4,
    permissionStatus: 'approved-local',
    attribution: 'EHF',
    routeUses: ['/'],
    retainedExternalUrl: null
  }] })).rejects.toThrow('download exceeds manifest byte count');
  expect(existsSync(downloadTestPath)).toBe(false);
});