import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAssetRecord } from './verify-local-assets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = resolve(root, 'public/assets');
const manifestPath = resolve(root, 'source-evidence/asset-manifest.json');

export function destinationForRecord(record) {
  if (record?.permissionStatus !== 'approved-local') throw new Error('downloader accepts approved-local records only');
  const errors = validateAssetRecord(record);
  if (errors.length) throw new Error(errors.join('; '));
  const destination = resolve(assetsRoot, `.${record.localPath.slice('/assets'.length)}`);
  if (relative(assetsRoot, destination).startsWith(`..${sep}`) || destination === assetsRoot) throw new Error(`output path must be below public/assets: ${record.localPath}`);
  return destination;
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function existingPathForHash(sha256) {
  if (!existsSync(assetsRoot)) return null;
  const stack = [assetsRoot];
  while (stack.length) {
    const directory = stack.pop();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (hash(readFileSync(path)) === sha256) return path;
    }
  }
  return null;
}

      

export async function downloadApprovedAssets(manifest) {
  const records = Array.isArray(manifest) ? manifest : manifest?.assets;
  if (!Array.isArray(records)) throw new Error('asset manifest must be an array or an envelope with assets');
  const deduplicated = new Map();
  for (const record of records) {
    if (record.permissionStatus !== 'approved-local') continue;
    const destination = destinationForRecord(record);
    if (deduplicated.has(record.sha256)) {
      const original = deduplicated.get(record.sha256);
      if (original !== record.localPath) throw new Error(`duplicate SHA-256 must use one localPath: ${record.localPath}`);
      continue;
    }
    const response = await fetch(record.sourceUrl);
    if (!response.ok) throw new Error(`download failed (${response.status}): ${record.sourceUrl}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== record.sha256) throw new Error(`download SHA-256 mismatch: ${record.sourceUrl}`);
    mkdirSync(dirname(destination), { recursive: true });
    const existing = existingPathForHash(record.sha256);
    if (existing && existing !== destination) throw new Error(`duplicate byte stream already has a different path: ${record.localPath}`);
    writeFileSync(destination, bytes);
    deduplicated.set(record.sha256, record.localPath);
  }
}

async function main() {
  if (!existsSync(manifestPath)) throw new Error('missing source-evidence/asset-manifest.json');
  await downloadApprovedAssets(JSON.parse(readFileSync(manifestPath, 'utf8')));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
