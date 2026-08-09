import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = resolve(root, 'public/assets');
const manifestPath = resolve(root, 'source-evidence/asset-manifest.json');
const routeManifestPath = resolve(root, 'source-evidence/route-manifest.json');
const assetKeys = ['id', 'classification', 'localPath', 'sha256', 'bytes', 'mediaType', 'routeUses', 'externalUrl'];
const textExtensions = new Set(['.astro', '.cjs', '.css', '.cts', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.mts', '.svg', '.ts', '.tsx']);

export const forbiddenSourceHosts = [
  'www.ehf.org',
  'orb-parrotfish-n735.squarespace.com'
];
const forbiddenSquarespaceDomains = [
  'squarespace-cdn.com',
  'static1.squarespace.com',
  'assets.squarespace.com'
];
export const forbiddenRuntimeDomains = [...forbiddenSourceHosts, ...forbiddenSquarespaceDomains];
const sourceHostUrl = String.raw`https?:\/\/(?:${forbiddenSourceHosts.map((domain) => domain.replaceAll('.', String.raw`\.`)).join('|')})(?=[:/?#"'\s]|$)`;
const squarespaceUrl = String.raw`https?:\/\/(?:${forbiddenSquarespaceDomains.map((domain) => domain.replaceAll('.', String.raw`\.`)).join('|')})(?=[:/?#"'\s]|$)`;

export function hasForbiddenRuntimeAssetReference(value) {
  return forbiddenRuntimeDomains.some((domain) => value.includes(domain));
}

function srcsetCandidates(value) {
  return [...value.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)]
    .flatMap(([, srcset]) => srcset.split(','))
    .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}


export function hasForbiddenEmbeddedAssetReference(value) {
  const markdownSources = [...value.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map(([, source]) => source);
  const htmlSources = [...value.matchAll(/<(?:img|source|script)\b[^>]*\b(?:src|srcset)=["']([^"']+)["']/gi)].map(([, source]) => source);
  const cssSources = [...value.matchAll(/\burl\(\s*["']?([^"')\s]+)/gi)].map(([, source]) => source);
  const linkSources = [...value.matchAll(/<link\b[^>]*>/gi)]
    .filter(([tag]) => /\brel=["'][^"']*\b(?:stylesheet|preload)\b[^"']*["']/i.test(tag))
    .flatMap(([tag]) => [...tag.matchAll(/\bhref=["']([^"']+)["']/gi)].map(([, source]) => source));
  const scriptSources = [...value.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(([, body]) => body);
  return [...markdownSources, ...htmlSources, ...cssSources, ...linkSources, ...scriptSources].some(hasForbiddenRuntimeAssetReference);
}

const sourceDestination = new RegExp(String.raw`(?:\b(?:href|src|srcset)\s*=\s*["']|"(?:href|src|srcset)"\s*:\s*"|\]\()${sourceHostUrl}`, 'i');
const sourceCssUrl = new RegExp(String.raw`\burl\(\s*["']?${sourceHostUrl}`, 'i');
const squarespaceEmbedded = new RegExp(String.raw`(?:\b(?:src|srcset)\s*=\s*["']|"(?:href|src|srcset)"\s*:\s*"|!\[[^\]]*\]\()${squarespaceUrl}`, 'i');
const squarespaceCssUrl = new RegExp(String.raw`\burl\(\s*["']?${squarespaceUrl}`, 'i');
const squarespaceAnywhere = new RegExp(squarespaceUrl, 'i');
const codeExtensions = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);

function hasForbiddenRuntimeReference(text, extension) {
  if (srcsetCandidates(text).some(hasForbiddenRuntimeAssetReference)) return true;
  if (sourceDestination.test(text)) return true;
  if (extension === '.css') return sourceCssUrl.test(text) || squarespaceAnywhere.test(text);
  if (codeExtensions.has(extension)) return squarespaceAnywhere.test(text);
  return squarespaceEmbedded.test(text) || squarespaceCssUrl.test(text);
}

function isSafeLocalPath(value) {
  return typeof value === 'string'
    && /^\/assets\/(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*$/.test(value)
    && !value.includes('..');
}

function isHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function validateAssetRecord(record) {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) return ['asset record must be an object'];
  if (Object.keys(record).length !== assetKeys.length || !assetKeys.every((key) => Object.hasOwn(record, key))) return ['asset record must have only contract fields'];

  const errors = [];
  if (typeof record.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) errors.push('asset needs a kebab-case id');
  if (!['local', 'external'].includes(record.classification)) errors.push('asset needs local or external classification');
  if (!Array.isArray(record.routeUses) || record.routeUses.length === 0 || new Set(record.routeUses).size !== record.routeUses.length || record.routeUses.some((route) => typeof route !== 'string' || !route.startsWith('/'))) errors.push('asset needs non-empty routeUses');

  if (record.classification === 'local') {
    if (!isSafeLocalPath(record.localPath)) errors.push('local asset needs a safe /assets/ localPath');
    if (typeof record.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.sha256)) errors.push('local asset needs a 64-character lowercase SHA-256');
    if (!Number.isSafeInteger(record.bytes) || record.bytes < 1) errors.push('local asset needs positive safe integer bytes');
    if (typeof record.mediaType !== 'string' || record.mediaType.length === 0) errors.push('local asset needs mediaType');
    if (record.externalUrl !== null) errors.push('local asset must not define externalUrl');
  }

  if (record.classification === 'external') {
    if (record.localPath !== null || record.sha256 !== null || record.bytes !== null || record.mediaType !== null) errors.push('external asset must not define local fields');
    if (!isHttpsUrl(record.externalUrl)) errors.push('external asset needs actual HTTPS externalUrl');
  }
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

export function localFileFor(localPath) {
  if (!isSafeLocalPath(localPath)) throw new Error(`output path must be below public/assets: ${localPath}`);
  const path = resolve(assetsRoot, `.${localPath.slice('/assets'.length)}`);
  if (relative(assetsRoot, path).startsWith(`..${sep}`) || path === assetsRoot) throw new Error(`asset path escapes public/assets: ${localPath}`);
  return path;
}

function includedRoutes() {
  const manifest = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  return new Set(manifest.routes.filter((route) => route.kind === 'included').map((route) => route.path));
}

export function verifyManifest(manifest) {
  const errors = [];
  if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest) || Object.keys(manifest).length !== 2 || manifest.schemaVersion !== 2 || !Array.isArray(manifest.assets)) {
    return ['asset manifest must be exactly a schemaVersion 2 envelope with assets'];
  }

  const routes = includedRoutes();
  const ids = new Set();
  const paths = new Set();
  const hashes = new Map();
  for (const [index, record] of manifest.assets.entries()) {
    for (const error of validateAssetRecord(record)) errors.push(`manifest[${index}]: ${error}`);
    if (typeof record?.id === 'string' && ids.has(record.id)) errors.push(`manifest[${index}]: duplicate asset id: ${record.id}`);
    if (typeof record?.id === 'string') ids.add(record.id);
    if (Array.isArray(record?.routeUses) && record.routeUses.some((route) => !routes.has(route))) errors.push(`manifest[${index}]: routeUses must only name included routes`);
    if (record?.classification !== 'local' || !isSafeLocalPath(record.localPath)) continue;
    if (paths.has(record.localPath)) errors.push(`manifest[${index}]: duplicate localPath: ${record.localPath}`);
    paths.add(record.localPath);
    if (hashes.has(record.sha256) && hashes.get(record.sha256) !== record.localPath) errors.push(`manifest[${index}]: duplicate byte stream must use one localPath`);
    hashes.set(record.sha256, record.localPath);
    let file;
    try { file = localFileFor(record.localPath); } catch (error) { errors.push(`manifest[${index}]: ${error.message}`); continue; }
    if (!existsSync(file) || !statSync(file).isFile()) { errors.push(`manifest[${index}]: missing local asset ${record.localPath}`); continue; }
    if (record.bytes !== statSync(file).size) errors.push(`manifest[${index}]: byte count mismatch for ${record.localPath}`);
    if (record.sha256 !== hashFile(file)) errors.push(`manifest[${index}]: SHA-256 mismatch for ${record.localPath}`);
  }
  return errors;
}

export function verifyRuntimeReferences(manifest) {
  const runtimeFiles = ['src', 'public', 'dist']
    .flatMap((directory) => walk(resolve(root, directory)))
    .filter((file) => textExtensions.has(extname(file)));
  return runtimeFiles.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return hasForbiddenRuntimeReference(text, extname(file)) ? [`forbidden runtime asset domain in ${relative(root, file)}`] : [];
  });
}

function main() {
  if (!existsSync(manifestPath)) throw new Error('missing source-evidence/asset-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const errors = [...verifyManifest(manifest), ...verifyRuntimeReferences(manifest)];
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Verified ${manifest.assets.length} strict asset records and runtime asset references.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
