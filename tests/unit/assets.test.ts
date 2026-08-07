import { expect, test } from 'vitest';
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