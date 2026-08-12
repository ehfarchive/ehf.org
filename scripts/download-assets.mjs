import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localFileFor, validateAssetRecord, verifyManifest } from './verify-local-assets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'source-evidence/asset-manifest.json');
const routeManifestPath = resolve(root, 'source-evidence/route-manifest.json');
const MAX_ASSET_BYTES = 32 * 1024 * 1024;
const MAX_REDISCOVERY_ASSET_REQUESTS = 512;
const MAX_APPROVED_REDIRECTS = 5;
export const approvedSourceHosts = new Set([
  'www.ehf.org',
  'orb-parrotfish-n735.squarespace.com'
]);
export const approvedAssetHosts = new Set([
  ...approvedSourceHosts,
  'images.squarespace-cdn.com',
  'static1.squarespace.com'
]);

function isApprovedUrl(value, approvedHosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && approvedHosts.has(url.hostname);
  } catch { return false; }
}

/**
 * @typedef {(url: string, init?: RequestInit) => Promise<Response>} ApprovedFetcher
 */

/**
 * @param {string | URL} url
 * @param {Set<string>} approvedHosts
 * @param {string} kind
 * @param {ApprovedFetcher} [fetcher]
 */
export async function fetchApprovedResponse(url, approvedHosts, kind, fetcher = fetch) {
  let current = new URL(url);
  for (let redirects = 0; redirects <= MAX_APPROVED_REDIRECTS; redirects += 1) {
    if (!isApprovedUrl(current, approvedHosts)) throw new Error(`unapproved ${kind} URL: ${current}`);
    const response = await fetcher(current.toString(), { redirect: 'manual' });
    if (response.url && !isApprovedUrl(response.url, approvedHosts)) throw new Error(`unapproved ${kind} URL: ${response.url}`);
    if (response.status < 300 || response.status >= 400) return response;
    if (redirects === MAX_APPROVED_REDIRECTS) throw new Error(`${kind} redirect limit exceeded`);
    const location = response.headers.get('location');
    if (!location) throw new Error(`${kind} redirect is missing Location`);
    current = new URL(location, current);
  }
  throw new Error(`${kind} redirect limit exceeded`);
}

export function approvedAssetCandidates(html, origin, maxRequests = MAX_REDISCOVERY_ASSET_REQUESTS) {
  const candidates = new Set();
  const add = (value) => {
    const url = new URL(value, origin).toString();
    if (!isApprovedUrl(url, approvedAssetHosts)) return;
    candidates.add(url);
    if (candidates.size > maxRequests) throw new Error('rediscovery candidate limit exceeded');
  };
  for (const [, src] of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) add(src);
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+\.pdf(?:[?#][^"']*)?)["']/gi)) add(href);
  return [...candidates];
}

export function destinationForRecord(record) {
  if (record?.classification !== 'local') throw new Error('downloader accepts local records only');
  const errors = validateAssetRecord(record);
  if (errors.length) throw new Error(errors.join('; '));
  return localFileFor(record.localPath);
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}


export async function readBoundedResponse(response, maxBytes = MAX_ASSET_BYTES) {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error('Content-Length exceeds limit');
  if (!response.body) throw new Error('download response has no body');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) throw new Error('download exceeds limit');
    chunks.push(Buffer.from(value));
  }
  if (declared !== null && total !== Number(declared)) throw new Error('download byte count does not match Content-Length');
  return Buffer.concat(chunks, total);
}

/**
 * @param {{ schemaVersion: 2, assets: readonly { classification: string, bytes: number | null, sha256: string | null }[] }} manifest
 * @param {string} origin
 * @param {readonly { path: string, kind: string }[]} [routes]
 * @param {ApprovedFetcher} [fetcher]
 * @param {(record: { localPath: string }) => string} [destinationFor]
 */
export async function discoverApprovedDownloads(
  manifest,
  origin,
  routes = JSON.parse(readFileSync(routeManifestPath, 'utf8')).routes,
  fetcher = fetch,
  destinationFor = destinationForRecord
) {
  const pending = new Map(manifest.assets.filter((record) => record.classification === 'local').map((record) => [`${record.bytes}:${record.sha256}`, record]));
  const candidates = new Set();
  for (const route of routes.filter((record) => record.kind === 'included')) {
    if (pending.size === 0) break;
    const page = await fetchApprovedResponse(new URL(route.path, origin), approvedSourceHosts, 'source', fetcher);
    if (!page.ok) throw new Error(`source fetch failed (${page.status}) for route ${route.path}`);
    const html = await page.text();
    for (const url of approvedAssetCandidates(html, origin, MAX_REDISCOVERY_ASSET_REQUESTS - candidates.size)) {
      candidates.add(url);
    }
  }
  for (const url of candidates) {
    if (pending.size === 0) break;
    const response = await fetchApprovedResponse(url, approvedAssetHosts, 'asset', fetcher);
    if (!response.ok) throw new Error(`source asset fetch failed (${response.status})`);
    const bytes = await readBoundedResponse(response);
    const record = pending.get(`${bytes.length}:${hash(bytes)}`);
    if (!record) continue;
    const destination = destinationFor(record);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, bytes);
    pending.delete(`${record.bytes}:${record.sha256}`);
  }
  if (pending.size) throw new Error(`could not rediscover approved assets: ${[...pending.values()].map((record) => record.id).join(', ')}`);
}
export async function downloadApprovedAssets(manifest, transientDownloads = new Map(), sourceOrigin = process.env.CONTENT_SOURCE_ORIGIN) {
  const errors = verifyManifest(manifest);
  if (errors.length && !errors.every((error) => error.includes('missing local asset'))) throw new Error(errors.join('\n'));
  const missing = manifest.assets.filter((record) => record.classification === 'local' && !existsSync(destinationForRecord(record)));
  if (missing.length && transientDownloads.size === 0) {
    if (!sourceOrigin) throw new Error('CONTENT_SOURCE_ORIGIN is required to rediscover missing assets');
    const origin = new URL(sourceOrigin).origin;
    if (origin !== sourceOrigin.replace(/\/$/, '') || !isApprovedUrl(origin, approvedSourceHosts)) throw new Error('CONTENT_SOURCE_ORIGIN must be an approved HTTPS origin without a path');
    await discoverApprovedDownloads(manifest, origin);
  }
  for (const record of manifest.assets) {
    if (record.classification !== 'local') continue;
    const destination = destinationForRecord(record);
    const transient = transientDownloads.get(record.id);
    if (transient !== undefined) {
      const bytes = Buffer.from(transient);
      if (bytes.length !== record.bytes || hash(bytes) !== record.sha256) throw new Error(`transient download does not match asset record: ${record.id}`);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, bytes);
    }
    if (!existsSync(destination)) throw new Error(`missing local asset: ${record.localPath}`);
    const bytes = readFileSync(destination);
    if (bytes.length !== record.bytes || hash(bytes) !== record.sha256) throw new Error(`local asset does not match asset record: ${record.localPath}`);
  }
}

async function main() {
  if (!existsSync(manifestPath)) throw new Error('missing source-evidence/asset-manifest.json');
  await downloadApprovedAssets(JSON.parse(readFileSync(manifestPath, 'utf8')));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
