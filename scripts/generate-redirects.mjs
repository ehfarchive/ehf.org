import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MANIFEST_PATH = resolve(ROOT, 'source-evidence/route-manifest.json');
const REDIRECTS_PATH = resolve(ROOT, 'public/_redirects');
const VERCEL_PATH = resolve(ROOT, 'vercel.json');

function normalizePath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.includes('?') || value.includes('#') || /\s/.test(value)) throw new Error(`Invalid route path: ${String(value)}`);
  const normalized = value === '/' ? value : value.replace(/\/+$/, '');
  if (!normalized || normalized.includes('//')) throw new Error(`Invalid route path: ${value}`);
  return normalized;
}

function readRedirects(input) {
  if (!input || input.schemaVersion !== 1 || !Array.isArray(input.routes) || Object.keys(input).length !== 2) throw new Error('Route manifest must be a schemaVersion 1 envelope');
  const included = new Set();
  const paths = new Set();
  const redirects = [];
  let previousPath = '';
  for (const route of input.routes) {
    if (!route || typeof route !== 'object' || typeof route.path !== 'string' || typeof route.kind !== 'string') throw new Error('Invalid route record');
    const path = normalizePath(route.path);
    if (path !== route.path) throw new Error(`Route path is not normalized: ${route.path}`);
    if (!['included', 'redirect', 'external', 'excluded'].includes(route.kind)) throw new Error(`Invalid route kind: ${route.kind}`);
    if (previousPath.localeCompare(path) > 0) throw new Error('Route manifest records must be sorted by path');
    if (paths.has(path)) throw new Error(`Route manifest duplicates path: ${path}`);
    if (route.kind === 'included') included.add(path);
    if (route.kind === 'redirect') {
      if (route.status !== 301 || !['legacy-alias', 'monthly-archive'].includes(route.redirectType) || typeof route.target !== 'string') throw new Error(`Invalid redirect: ${path}`);
      redirects.push({ source: path, destination: normalizePath(route.target) });
    }
    previousPath = path;
    paths.add(path);
  }
  for (const redirect of redirects) if (!included.has(redirect.destination)) throw new Error(`Redirect ${redirect.source} targets a non-included path`);
  const aliases = redirects.filter((redirect) => ['/homepage', '/impact-in-action', '/archive'].includes(redirect.source));
  const approvedAliases = { '/homepage': '/', '/impact-in-action': '/read', '/archive': '/read' };
  if (aliases.length !== 3 || aliases.some((redirect) => approvedAliases[redirect.source] !== redirect.destination)) throw new Error('Approved legacy aliases are incomplete or changed');
  if (redirects.filter((redirect) => !Object.hasOwn(approvedAliases, redirect.source)).length !== 31) throw new Error('Expected exactly 31 monthly archive redirects');
  return redirects.sort((left, right) => left.source.localeCompare(right.source));
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const redirects = readRedirects(manifest);
const netlify = `${redirects.map((redirect) => `${redirect.source} ${redirect.destination} 301!`).join('\n')}\n`;
const vercel = `${JSON.stringify({ redirects: redirects.map((redirect) => ({ source: redirect.source, destination: redirect.destination, permanent: true })) }, null, 2)}\n`;
await Promise.all([writeFile(REDIRECTS_PATH, netlify), writeFile(VERCEL_PATH, vercel)]);
console.log(`Generated ${redirects.length} permanent redirects.`);
