import { createHash } from 'node:crypto';
import { statSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicAssetsRoot = resolve(fileURLToPath(new URL('../../public/assets', import.meta.url)));

export type AssetBase = {
  id: string;
  routeUses: readonly string[];
};

export type LocalAssetRecord = AssetBase & {
  classification: 'local';
  localPath: string;
  sha256: string;
  bytes: number;
  mediaType: string;
  externalUrl: null;
};

export type ExternalAssetRecord = AssetBase & {
  classification: 'external';
  localPath: null;
  sha256: null;
  bytes: null;
  mediaType: null;
  externalUrl: string;
};

export type AssetRecord = LocalAssetRecord | ExternalAssetRecord;

export type AssetManifest = {
  schemaVersion: 2;
  assets: readonly AssetRecord[];
};

const assetKeys = ['id', 'classification', 'localPath', 'sha256', 'bytes', 'mediaType', 'routeUses', 'externalUrl'];


function safeAssetPath(value: unknown): value is string {
  return typeof value === 'string'
    && /^\/assets\/(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*$/.test(value)
    && !value.includes('..');
}

function httpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function validateAssetManifestRecord(value: unknown): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ['asset record must be an object'];
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== assetKeys.length || !assetKeys.every((key) => Object.hasOwn(record, key))) return ['asset record must have only contract fields'];

  const errors: string[] = [];
  if (typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) errors.push('asset needs a kebab-case id');
  if (record.classification !== 'local' && record.classification !== 'external') errors.push('asset needs local or external classification');
  if (!Array.isArray(record.routeUses) || record.routeUses.length === 0 || new Set(record.routeUses).size !== record.routeUses.length || record.routeUses.some((route) => typeof route !== 'string' || !route.startsWith('/'))) {
    errors.push('asset needs non-empty routeUses');
  }

  if (record.classification === 'local') {
    if (!safeAssetPath(record.localPath)) errors.push('local asset needs a safe /assets/ localPath');
    if (typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) errors.push('local asset needs a 64-character lowercase SHA-256');
    if (!Number.isSafeInteger(record.bytes) || (record.bytes as number) < 1) errors.push('local asset needs positive safe integer bytes');
    if (typeof record.mediaType !== 'string' || record.mediaType.length === 0) errors.push('local asset needs mediaType');
    if (record.externalUrl !== null) errors.push('local asset must not define externalUrl');
  }

  if (record.classification === 'external') {
    if (record.localPath !== null || record.sha256 !== null || record.bytes !== null || record.mediaType !== null) errors.push('external asset must not define local fields');
    if (!httpsUrl(record.externalUrl)) errors.push('external asset needs actual HTTPS externalUrl');
  }

  return errors;
}

export function resolveLocalAsset(id: string, manifest: AssetManifest, assetRoot = publicAssetsRoot): string {
  if (!manifest || manifest.schemaVersion !== 2 || !Array.isArray(manifest.assets)) throw new Error('invalid asset manifest');
  const records = manifest.assets.filter((asset) => asset?.id === id);
  if (records.length === 0) throw new Error(`missing local asset: ${id}`);
  if (records.length > 1) throw new Error(`duplicate asset id: ${id}`);
  const [record] = records;
  const errors = validateAssetManifestRecord(record);
  if (errors.length) throw new Error(errors.join('; '));
  if (record.classification !== 'local') throw new Error(`asset ${id} is external`);

  const file = resolve(assetRoot, `.${record.localPath.slice('/assets'.length)}`);
  if (relative(assetRoot, file).startsWith(`..${sep}`) || file === assetRoot) throw new Error(`asset path escapes public/assets: ${record.localPath}`);
  let stats;
  try { stats = statSync(file); } catch { throw new Error(`missing local asset: ${record.localPath}`); }
  if (!stats.isFile()) throw new Error(`local asset is not a regular file: ${record.localPath}`);
  if (stats.size !== record.bytes) throw new Error(`byte count mismatch for ${record.localPath}`);
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (sha256 !== record.sha256) throw new Error(`SHA-256 mismatch for ${record.localPath}`);
  return record.localPath;
}
