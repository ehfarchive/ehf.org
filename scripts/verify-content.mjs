import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContentManifest, hasForbiddenSourceHostRuntimeReference } from './migrate-content.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routeManifestPath = resolve(root, 'source-evidence/route-manifest.json');
const contentManifestPath = resolve(root, 'source-evidence/content-manifest.json');
const textExtensions = new Set(['.astro', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx']);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function sourceHostRuntimeMatches() {
  return walk(resolve(root, 'src'))
    .filter((path) => textExtensions.has(extname(path)))
    .flatMap((path) => hasForbiddenSourceHostRuntimeReference(readFileSync(path, 'utf8')) ? [`source host runtime string in ${relative(root, path)}`] : []);
}

export function verifyContent() {
  if (!existsSync(contentManifestPath)) return ['missing source-evidence/content-manifest.json'];
  const routeManifest = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  const existing = JSON.parse(readFileSync(contentManifestPath, 'utf8'));
  const { manifest: expected, errors } = buildContentManifest(routeManifest);
  if (JSON.stringify(existing) !== JSON.stringify(expected)) errors.push('content manifest does not match deterministic typed inputs; run content:migrate');
  errors.push(...sourceHostRuntimeMatches());
  return errors;
}

function main() {
  const errors = verifyContent();
  if (errors.length) throw new Error(errors.join('\n'));
  const manifest = JSON.parse(readFileSync(contentManifestPath, 'utf8'));
  console.log(`Verified ${manifest.content.length} strict content records and typed local inputs.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
