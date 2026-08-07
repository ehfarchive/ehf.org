import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = resolve(root, 'public/assets');
const manifestPath = resolve(root, 'source-evidence/asset-manifest.json');
const routes = new Set(['/', '/read', '/read/how-chemergy-is-changing-the-game-in-waste-to-energy', '/23-annual-report']);

export const forbiddenRuntimeDomains = [
  'squarespace-cdn.com',
  'static1.squarespace.com',
  'assets.squarespace.com'
];

export function hasForbiddenRuntimeAssetReference(value) {
  return forbiddenRuntimeDomains.some((domain) => value.includes(domain));
}

export function validateAssetRecord(record) {
  const errors = [];
  const isHash = /^[a-f0-9]{64}$/.test(record?.sha256 ?? '');
  const isAssetPath = typeof record?.localPath === 'string' && record.localPath.startsWith('/assets/');
  const validStatus = ['approved-local', 'external-only', 'blocked'].includes(record?.permissionStatus);

  if (!record?.sourceUrl || !record?.attribution || !validStatus) errors.push('asset record needs sourceUrl, attribution, and valid permissionStatus');
  if (!Array.isArray(record?.routeUses) || record.routeUses.length === 0 || record.routeUses.some((route) => !routes.has(route))) errors.push('asset record needs valid routeUses');
  if (record?.permissionStatus === 'approved-local' && (!isAssetPath || !isHash || record.retainedExternalUrl !== null)) errors.push('approved local asset needs /assets path and SHA-256');
  if (record?.permissionStatus === 'external-only' && (record.localPath !== null || record.sha256 !== null || !record.retainedExternalUrl)) errors.push('external-only asset needs retainedExternalUrl');
  if (record?.permissionStatus === 'blocked' && (record.localPath !== null || record.sha256 !== null || record.retainedExternalUrl !== null)) errors.push('blocked asset must not have localPath or sha256');
  return errors;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function localFileFor(localPath) {
  const path = resolve(assetsRoot, `.${localPath.slice('/assets'.length)}`);
  if (relative(assetsRoot, path).startsWith(`..${sep}`) || path === assetsRoot) throw new Error(`asset path escapes public/assets: ${localPath}`);
  return path;
}

export function verifyManifest(manifest) {
  const errors = [];
  const seenPaths = new Map();
  const seenHashes = new Map();
  const records = Array.isArray(manifest) ? manifest : manifest?.assets;

  if (!Array.isArray(records)) return ['asset manifest must be an array or an envelope with assets'];
  if (!Array.isArray(manifest) && manifest.schemaVersion !== 1) errors.push('asset manifest envelope must have schemaVersion 1');
  for (const [index, record] of records.entries()) {
    for (const error of validateAssetRecord(record)) errors.push(`manifest[${index}]: ${error}`);
    if (record?.permissionStatus !== 'approved-local') continue;
    if (!Number.isSafeInteger(record?.bytes) || record.bytes < 1) errors.push(`manifest[${index}]: approved local asset needs byte count`);
    let file;
    try { file = localFileFor(record.localPath); } catch (error) { errors.push(`manifest[${index}]: ${error.message}`); continue; }
    if (!existsSync(file) || !statSync(file).isFile()) { errors.push(`manifest[${index}]: missing local asset ${record.localPath}`); continue; }
    if (record.bytes !== statSync(file).size) errors.push(`manifest[${index}]: byte count mismatch for ${record.localPath}`);
    const actualHash = hashFile(file);
    if (actualHash !== record.sha256) errors.push(`manifest[${index}]: SHA-256 mismatch for ${record.localPath}`);
    if (seenPaths.has(record.localPath) && seenPaths.get(record.localPath) !== record.sha256) errors.push(`manifest[${index}]: conflicting local path ${record.localPath}`);
    if (seenHashes.has(record.sha256) && seenHashes.get(record.sha256) !== record.localPath) errors.push(`manifest[${index}]: duplicate byte stream must share one localPath`);
    seenPaths.set(record.localPath, record.sha256);
    seenHashes.set(record.sha256, record.localPath);
  }
  return errors;
}

export function verifyRuntimeReferences() {
  const runtimeFiles = [...walk(resolve(root, 'src')), ...walk(resolve(root, 'dist'))];
  return runtimeFiles.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return hasForbiddenRuntimeAssetReference(text) ? [`forbidden runtime asset domain in ${relative(root, file)}`] : [];
  });
}

function main() {
  if (!existsSync(manifestPath)) throw new Error('missing source-evidence/asset-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const records = Array.isArray(manifest) ? manifest : manifest.assets;
  const errors = [...verifyManifest(manifest), ...verifyRuntimeReferences()];
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Verified ${records.length} asset manifest records and runtime asset references.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
