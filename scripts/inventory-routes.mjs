import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultManifest = resolve(ROOT, 'source-evidence/route-manifest.json');
const sourceOrigin = 'https://www.ehf.org';

function normalizePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('?') || value.includes('#') || /\s/.test(value)) throw new Error(`Invalid sitemap path: ${String(value)}`);
  const normalized = value === '/' ? value : value.replace(/\/+$/, '');
  if (!normalized || normalized.includes('//')) throw new Error(`Invalid sitemap path: ${value}`);
  return normalized;
}

async function readSource(location) {
  if (/^https:\/\//.test(location)) {
    const response = await fetch(location, { headers: { accept: 'application/xml,text/xml;q=0.9,*/*;q=0.1' } });
    if (!response.ok) throw new Error(`Unable to fetch sitemap: HTTP ${response.status}`);
    return response.text();
  }
  return readFile(resolve(ROOT, location), 'utf8');
}

function parseSitemap(xml) {
  const locations = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1].trim());
  if (locations.length === 0) throw new Error('Sitemap contains no <loc> entries');
  const paths = locations.map((location) => {
    const url = new URL(location);
    if (url.origin !== sourceOrigin) throw new Error(`Sitemap route has an unexpected origin: ${location}`);
    return normalizePath(url.pathname);
  });
  return [...new Set(paths)].sort((left, right) => left.localeCompare(right));
}

function parseArgs(argv) {
  const values = { manifest: defaultManifest, sitemap: `${sourceOrigin}/sitemap.xml` };
  for (let index = 0; index < argv.length; index += 1) {
    const [name, value] = argv[index].split('=', 2);
    if (name === '--manifest') values.manifest = value ?? argv[++index];
    else if (name === '--sitemap') values.sitemap = value ?? argv[++index];
    else throw new Error(`Unsupported argument: ${argv[index]}`);
  }
  if (!values.manifest || !values.sitemap) throw new Error('Both --manifest and --sitemap require a value');
  return values;
}

const { manifest: manifestPath, sitemap } = parseArgs(process.argv.slice(2));
const [manifestText, sitemapText] = await Promise.all([readFile(resolve(ROOT, manifestPath), 'utf8'), readSource(sitemap)]);
const manifest = JSON.parse(manifestText);
if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.routes) || Object.keys(manifest).length !== 2) throw new Error('Route manifest must be a schemaVersion 1 envelope');
const candidates = parseSitemap(await sitemapText);
const recordsByPath = new Map();
let previousPath = '';
for (const route of manifest.routes) {
  if (!route || typeof route !== 'object' || typeof route.path !== 'string' || !['included', 'redirect', 'external', 'excluded'].includes(route.kind)) throw new Error('Route manifest contains an invalid route record');
  const path = normalizePath(route.path);
  if (path !== route.path) throw new Error(`Route manifest path is not normalized: ${route.path}`);
  if (previousPath.localeCompare(path) > 0) throw new Error('Route manifest records must be sorted by path');
  if (recordsByPath.has(path)) throw new Error(`Route manifest duplicates path: ${path}`);
  recordsByPath.set(path, route);
  previousPath = path;
}
const unclassified = candidates.filter((path) => !recordsByPath.has(path));
if (unclassified.length > 0) throw new Error(`Unclassified sitemap paths: ${unclassified.join(', ')}`);
console.log(`${JSON.stringify({ sitemap, candidateCount: candidates.length, classifiedCount: candidates.length, unclassified: [] }, null, 2)}\n`);
