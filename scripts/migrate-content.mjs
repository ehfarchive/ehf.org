import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { approvedAssetHosts, approvedSourceHosts, fetchApprovedResponse, readBoundedResponse } from './download-assets.mjs';
import { forbiddenSourceHosts } from './verify-local-assets.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const routeManifestPath = resolve(root, 'source-evidence/route-manifest.json');
const contentManifestPath = resolve(root, 'source-evidence/content-manifest.json');
const assetManifestPath = resolve(root, 'source-evidence/asset-manifest.json');
const assetsRoot = resolve(root, 'public/assets');
const typedFamilies = new Set(['impact-article', 'news-article', 'event-programme', 'annual-report-document', 'institutional', 'contact-media-donation', 'legal']);
const generatedFamilies = new Set(['homepage', 'impact-listing', 'news-listing', 'not-found']);
const folderByFamily = {
  'impact-article': 'src/content/impact',
  'news-article': 'src/content/news',
  'event-programme': 'src/content/events',
  'institutional': 'src/content/pages/institutional',
  'legal': 'src/content/pages/legal',
  'annual-report-document': 'src/content/pages/reports',
  'contact-media-donation': 'src/content/pages/contact-media-donation'
};
const extensionByFamily = {
  'impact-article': '.md',
  'news-article': '.md',
  'event-programme': '.md',
  'institutional': '.json',
  'legal': '.json',
  'annual-report-document': '.json',
  'contact-media-donation': '.json'
};
const unsupportedTags = new Set(['object', 'embed', 'form', 'video', 'audio']);
const forbiddenSourceHost = new RegExp(String.raw`\]\(https?://(?:${forbiddenSourceHosts.map((host) => host.replaceAll('.', String.raw`\.`)).join('|')})(?=[:/?#"'\s]|\))`, 'i');
const managedOutputPaths = [...new Set([
  ...Object.values(folderByFamily),
  'public/assets/images/content',
  'public/assets/documents',
  'source-evidence/content-manifest.json',
  'source-evidence/asset-manifest.json'
])];

function assetsRootFor(baseRoot) {
  return resolve(baseRoot, 'public/assets');
}

function transactionRoot() {
  const path = resolve(root, `.content-materialize-${process.pid}-${randomUUID()}`);
  mkdirSync(path);
  return path;
}

export function hasForbiddenSourceHostRuntimeReference(text) {
  return forbiddenSourceHost.test(text);
}
function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function inputForRoute(route, family) {
  if (!typedFamilies.has(family)) return null;
  const prefix = family === 'impact-article' ? '/read/' : family === 'news-article' ? '/news-blog/' : '/';
  const identity = route.path.slice(prefix.length).replaceAll('/', '-');
  return `${folderByFamily[family]}/${identity}${extensionByFamily[family]}`;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function children(node) {
  return node.childNodes ?? [];
}

function attribute(node, name) {
  return node.attrs?.find((attribute) => attribute.name === name)?.value ?? null;
}

function findFirst(node, predicate) {
  if (predicate(node)) return node;
  for (const child of children(node)) {
    const match = findFirst(child, predicate);
    if (match) return match;
  }
  return null;
}

function findAll(node, predicate, result = []) {
  if (predicate(node)) result.push(node);
  for (const child of children(node)) findAll(child, predicate, result);
  return result;
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}
function stripTrailingHrefArtifacts(value) {
  return value.replace(/(?:%c2%a0|\u00a0)+$/gi, '');
}

function outputHref(value) {
  if (typeof value !== 'string') return value;
  const cleaned = stripTrailingHrefArtifacts(value);
  try {
    const url = new URL(cleaned);
    return ['www.ehf.org', 'orb-parrotfish-n735.squarespace.com'].includes(url.hostname)
      ? stripTrailingHrefArtifacts(`${url.pathname}${url.search}${url.hash}`)
      : cleaned;
  } catch { return cleaned; }
}


function inlineMarkdown(node) {
  if (node.nodeName === '#text') return node.value ?? '';
  if (node.tagName === 'a') {
    const label = normalize(children(node).map(inlineMarkdown).join(''));
    const href = outputHref(attribute(node, 'href'));
    return href && label ? `[${label}](${href})` : label;
  }
  if (node.tagName === 'br') return '\n';
  const text = children(node).map(inlineMarkdown).join('');
  if (node.tagName === 'strong' || node.tagName === 'b') return `**${normalize(text)}**`;
  if (node.tagName === 'em' || node.tagName === 'i') return `*${normalize(text)}*`;
  return text;
}

function assertNoUnsupportedBlocks(scope) {
  const unsupported = findFirst(scope, (node) => unsupportedTags.has(node.tagName));
  if (unsupported) throw new Error(`unsupported source block: ${unsupported.tagName}`);
}
function markdownBlocks(scope, options = {}) {
  const blocks = [];
  let firstH1 = true;
  const visit = (node) => {
    if (node.tagName === 'iframe') {
      const rawSrc = attribute(node, 'src');
      const src = rawSrc?.startsWith('//') ? `https:${rawSrc}` : rawSrc;
      if (!src?.startsWith('https://')) throw new Error('unsupported source block: iframe');
      blocks.push(`[External service](${src})`);
      return;
    }
    if (node.tagName === 'h1') {
      if (options.includeSectionH1 && !firstH1) blocks.push(`# ${normalize(inlineMarkdown(node))}`);
      firstH1 = false;
      return;
    }
    if (node.tagName === 'h2' || node.tagName === 'h3' || node.tagName === 'h4') {
      blocks.push(`${'#'.repeat(Number(node.tagName.slice(1)))} ${normalize(inlineMarkdown(node))}`);
      return;
    }
    if (node.tagName === 'p') {
      const text = normalize(inlineMarkdown(node));
      if (text) blocks.push(text);
      return;
    }
    if (node.tagName === 'blockquote') {
      const text = normalize(inlineMarkdown(node));
      if (text) blocks.push(`> ${text}`);
      return;
    }
    if (node.tagName === 'li') {
      const text = normalize(inlineMarkdown(node));
      if (text) blocks.push(`- ${text}`);
      return;
    }
    if (node.tagName === 'figure') {
      const image = findFirst(node, (child) => child.tagName === 'img');
      if (image) {
        const src = attribute(image, 'src');
        const alt = attribute(image, 'alt') ?? '';
        if (src) blocks.push(`![${alt}](${src})`);
      }
      const caption = findFirst(node, (child) => child.tagName === 'figcaption');
      if (caption) blocks.push(`*${normalize(inlineMarkdown(caption))}*`);
      return;
    }
    for (const child of children(node)) visit(child);
  };
  visit(scope);
  return blocks;
}

function articleScope(html) {
  const document = parse(html);
  const scope = findFirst(document, (node) => node.tagName === 'main')
    ?? findFirst(document, (node) => node.tagName === 'article')
    ?? findFirst(document, (node) => node.tagName === 'body');
  if (!scope) throw new Error('source page has no readable content root');
  assertNoUnsupportedBlocks(scope);
  return { document, scope };
}

function withoutSiteChrome(title) {
  let cleaned = normalize(title);
  while (true) {
    const next = cleaned.replace(/\s*(?:[|–—-])\s*(?:EHF(?:\s+Archive)?|Edmund Hillary Fellowship)\s*$/i, '').trim();
    if (next === cleaned) return cleaned;
    cleaned = next;
  }
}

function titleFor(document, scope) {
  const titleNode = findFirst(scope, (node) => node.tagName === 'h1');
  const heading = titleNode ? normalize(inlineMarkdown(titleNode)) : '';
  if (heading) return heading;
  const metadata = findFirst(document, (node) => node.tagName === 'meta' && attribute(node, 'property') === 'og:title');
  const metadataTitle = metadata ? withoutSiteChrome(attribute(metadata, 'content') ?? '') : '';
  if (metadataTitle) return metadataTitle;
  const documentTitle = findFirst(document, (node) => node.tagName === 'title');
  return documentTitle ? withoutSiteChrome(inlineMarkdown(documentTitle)) : '';
}

function descriptionFor(document, scope) {
  const metadata = findFirst(document, (node) => node.tagName === 'meta'
    && (attribute(node, 'name') === 'description' || attribute(node, 'property') === 'og:description'));
  if (metadata) return normalize(attribute(metadata, 'content') ?? '');
  return findAll(scope, (node) => node.tagName === 'p').map((node) => normalize(inlineMarkdown(node))).find(Boolean) ?? '';
}

function publishedAtFor(document, scope) {
  const metadata = findFirst(document, (node) => node.tagName === 'meta'
    && (
      ['article:published_time', 'og:published_time'].includes(attribute(node, 'property'))
      || attribute(node, 'itemprop') === 'datePublished'
    ));
  const time = findFirst(scope, (node) => node.tagName === 'time' && attribute(node, 'datetime'));
  const value = metadata ? attribute(metadata, 'content') : time ? attribute(time, 'datetime') : null;
  return value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
}

export function extractArticleContent(html) {
  const { document, scope } = articleScope(html);
  const title = titleFor(document, scope);
  if (!title) throw new Error('source article has no title');
  const paragraphs = findAll(scope, (node) => node.tagName === 'p').map((node) => normalize(inlineMarkdown(node))).filter(Boolean);
  const body = markdownBlocks(scope).join('\n\n');
  return {
    title,
    excerpt: paragraphs[0] ?? '',
    body,
    publishedAt: publishedAtFor(document, scope),
    images: findAll(scope, (node) => node.tagName === 'img').map((image) => ({ src: attribute(image, 'src'), alt: attribute(image, 'alt') ?? '' })).filter((image) => image.src?.startsWith('https://')),
    externalUrls: findAll(scope, (node) => node.tagName === 'iframe').map((frame) => attribute(frame, 'src')).filter((src) => src?.startsWith('https://'))
  };
}
export function extractPageInput(route, html) {
  const { document, scope } = articleScope(html);
  const title = titleFor(document, scope);
  if (!title) throw new Error('source page has no title');
  const body = markdownBlocks(scope, { includeSectionH1: true });
  const description = descriptionFor(document, scope) || body.find((block) => !/^#+\s/.test(block)) || '';
  const links = findAll(scope, (node) => node.tagName === 'a').map((link) => ({ label: normalize(children(link).map(inlineMarkdown).join('')), href: outputHref(attribute(link, 'href')) })).filter((link) => link.label && link.href).map((link) => ({ label: link.label, href: link.href }));
  return { route, title, description, heading: title, body, heroImage: null, heroAlt: null, links };
}

export function validatePageRecord(value, route, family, displayPath = route) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`page input must be an object: ${displayPath}`];
  const keys = ['route', 'title', 'description', 'heading', 'body', 'heroImage', 'heroAlt', 'links'];
  if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) return [`page input must use exact schema: ${displayPath}`];
  const errors = [];
  if (value.route !== route) errors.push(`page input route does not match manifest route: ${displayPath}`);
  if (![value.title, value.description, value.heading].every((field) => typeof field === 'string')) errors.push(`page input has invalid text fields: ${displayPath}`);
  if (!Array.isArray(value.body) || value.body.some((paragraph) => typeof paragraph !== 'string')) errors.push(`page input body must be a string array: ${displayPath}`);
  if (value.heroImage !== null && (typeof value.heroImage !== 'string' || !value.heroImage.startsWith('/assets/'))) errors.push(`page input heroImage must be local or null: ${displayPath}`);
  if (value.heroAlt !== null && typeof value.heroAlt !== 'string') errors.push(`page input heroAlt must be string or null: ${displayPath}`);
  if (!Array.isArray(value.links) || value.links.some((link) => typeof link !== 'object' || link === null || Array.isArray(link) || Object.keys(link).length !== 2 || typeof link.label !== 'string' || typeof link.href !== 'string')) errors.push(`page input links must be label/href records: ${displayPath}`);
  if (['institutional', 'legal', 'annual-report-document'].includes(family)
    && (!value.title.trim() || !value.description.trim() || !value.heading.trim() || !Array.isArray(value.body) || value.body.length === 0 || value.body.some((paragraph) => !paragraph.trim()))) {
    errors.push('page input needs non-empty description and body');
  }
  if (family === 'contact-media-donation'
    && (!value.title.trim() || !value.heading.trim() || !Array.isArray(value.body) || value.body.length === 0 || value.body.some((paragraph) => !paragraph.trim()))) {
    errors.push('contact/media/donation page input needs non-empty title, heading, and body');
  }
  if (family === 'annual-report-document' && (!Array.isArray(value.links) || !value.links.some((link) => link?.href?.startsWith('/assets/documents/')))) {
    errors.push('annual report page input needs at least one local document link');
  }
  return errors;
}
function validatePageInput(path, route, family, baseRoot = root) {
  let value;
  try { value = JSON.parse(readFileSync(path, 'utf8')); } catch { return [`invalid JSON page input: ${relative(baseRoot, path)}`]; }
  return validatePageRecord(value, route, family, relative(baseRoot, path));
}

export function buildContentManifest(routeManifest, baseRoot = root) {
  const errors = [];
  const content = [];
  for (const route of routeManifest.routes) {
    if (route.kind !== 'included') continue;
    if (!typedFamilies.has(route.family) && !generatedFamilies.has(route.family)) { errors.push(`unsupported included template: ${route.family}`); continue; }
    const localInput = inputForRoute(route, route.family);
    if (localInput === null) {
      content.push({ route: route.path, template: route.family, localInput: null, contentHash: null });
      continue;
    }
    const path = resolve(baseRoot, localInput);
    if (!path.startsWith(`${baseRoot}${sep}`) || !existsSync(path)) { errors.push(`missing typed local input: ${localInput}`); continue; }
    const bytes = readFileSync(path);
    const text = bytes.toString('utf8');
    if (/<(?:script|iframe|object|embed|style|form|video|audio)\b/i.test(text)) errors.push(`unsupported source block in ${localInput}`);
    if (hasForbiddenSourceHostRuntimeReference(text)) errors.push(`source host runtime string in ${localInput}`);
    if (localInput.endsWith('.json')) errors.push(...validatePageInput(path, route.path, route.family));
    content.push({ route: route.path, template: route.family, localInput, contentHash: hash(bytes) });
  }
  const expectedInputs = new Set(content.map((record) => record.localInput).filter(Boolean));
  for (const directory of Object.values(folderByFamily)) {
    for (const path of walk(resolve(baseRoot, directory))) {
      const localInput = relative(baseRoot, path).replaceAll(sep, '/');
      if (!expectedInputs.has(localInput)) errors.push(`typed content file is not manifest-included: ${localInput}`);
    }
  }
  return { manifest: { schemaVersion: 1, content }, errors };
}

function mediaTypeFor(path, response) {
  const supplied = response?.headers.get('content-type')?.split(';')[0];
  if (supplied) return supplied;
  return ({ '.avif': 'image/avif', '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' })[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

function assetPath(route, ordinal, mediaType) {
  const extension = ({ 'image/avif': '.avif', 'image/gif': '.gif', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/svg+xml': '.svg', 'image/webp': '.webp' })[mediaType] ?? '.bin';
  return `/assets/images/content/${route.slice(1).replaceAll('/', '-')}-${ordinal}${extension}`;
}

async function fetchBytes(url, fetcher = fetch) {
  const response = await fetchApprovedResponse(url, approvedAssetHosts, 'asset', fetcher);
  if (!response.ok) throw new Error(`source fetch failed (${response.status})`);
  return { bytes: await readBoundedResponse(response), response };
}

const documentNames = {
  'Hillary-Institute-EHF-Annual-Report-2022-Web.pdf': 'hillary-institute-ehf-annual-report-2022.pdf',
  'Hillary-Institute-EHF-Annual-Report-2022-web.pdf': 'hillary-institute-ehf-annual-report-2022.pdf',
  'EHF-HI-Annual-Report-2023.pdf': 'ehf-hi-annual-report-2023.pdf',
  'Edmund-Hillary-Fellowship-Limited-2023-Financial-Statements-2.pdf': 'edmund-hillary-fellowship-limited-2023-financial-statements.pdf',
  'The-Hillary-Institute-of-International-Leadership-_-Subsidiary-Entities-2023-Financial-Stat-2-1.pdf': 'the-hillary-institute-subsidiary-entities-2023-financial-statements.pdf'
};

export function documentPathForSource(source) {
  const name = basename(new URL(source).pathname);
  const output = documentNames[name] ?? name.toLowerCase().replaceAll(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
  if (!output.endsWith('.pdf')) throw new Error('annual report document must be a PDF');
  return `/assets/documents/${output}`;
}

async function localizeDocument(href, origin, outputAssetsRoot, fetcher) {
  const source = new URL(href, origin).toString();
  const { bytes } = await fetchBytes(source, fetcher);
  const localPath = documentPathForSource(source);
  const destination = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
  return localPath;
}

async function localizeImage(image, route, ordinal, origin, outputAssetsRoot, fetcher) {
  const source = new URL(image.src, origin).toString();
  const { bytes, response } = await fetchBytes(source, fetcher);
  const mediaType = mediaTypeFor(source, response);
  const localPath = assetPath(route, ordinal, mediaType);
  const destination = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
  return { source, localPath, mediaType, sha256: hash(bytes), bytes: bytes.length, alt: image.alt };
}

function frontmatter(article, heroImage, heroAlt) {
  const publishedAt = article.publishedAt ? `publishedAt: ${JSON.stringify(article.publishedAt)}\n` : '';
  return `---\ntitle: ${JSON.stringify(article.title)}\nexcerpt: ${JSON.stringify(article.excerpt)}\nheroImage: ${heroImage === null ? 'null' : JSON.stringify(heroImage)}\nheroAlt: ${heroAlt === null ? 'null' : JSON.stringify(heroAlt)}\n${publishedAt}---\n\n`;
}

export function assetReferencesForContent(records) {
  const local = new Map();
  const external = new Map();
  for (const { route, text } of records) {
    for (const match of text.matchAll(/\/assets\/[a-z0-9][a-z0-9_./-]*\.[a-z0-9]+/gi)) {
      if (!local.has(match[0])) local.set(match[0], new Set());
      local.get(match[0]).add(route);
    }
    for (const match of text.matchAll(/\[External service\]\((https:\/\/[^)\s]+)\)/g)) {
      if (!external.has(match[1])) external.set(match[1], new Set());
      external.get(match[1]).add(route);
    }
  }
  return { local, external };
}

function externalAssetId(url) {
  const parsed = new URL(url);
  return `external-${`${parsed.hostname}${parsed.pathname}-${hash(url).slice(0, 12)}`.replaceAll(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

function currentTypedAssetReferences(routes, baseRoot = root) {
  return assetReferencesForContent(routes
    .filter((route) => route.kind === 'included' && typedFamilies.has(route.family))
    .map((route) => {
      const localInput = inputForRoute(route, route.family);
      return { route: route.path, text: readFileSync(resolve(baseRoot, localInput), 'utf8') };
    }));
}

function stableAssetRecords(routes, baseRoot = root) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const references = currentTypedAssetReferences(routes, baseRoot);
  const recordsByHash = new Map();
  for (const [localPath, routeUses] of references.local) {
    const path = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
    if (!path.startsWith(`${outputAssetsRoot}${sep}`) || !existsSync(path) || !statSync(path).isFile()) throw new Error(`missing referenced local asset: ${localPath}`);
    const bytes = readFileSync(path);
    const sha256 = hash(bytes);
    const existing = recordsByHash.get(sha256);
    if (existing) {
      for (const route of routeUses) existing.routeUses.add(route);
      continue;
    }
    recordsByHash.set(sha256, {
      id: `asset-${localPath.slice('/assets/'.length).replaceAll(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`,
      classification: 'local',
      localPath,
      sha256,
      bytes: bytes.length,
      mediaType: mediaTypeFor(path),
      routeUses: new Set(routeUses),
      externalUrl: null
    });
  }
  const localRecords = [...recordsByHash.values()].map((record) => ({ ...record, routeUses: [...record.routeUses].sort() }));
  const externalRecords = [...references.external].map(([externalUrl, routeUses]) => ({
    id: externalAssetId(externalUrl),
    classification: 'external',
    localPath: null,
    sha256: null,
    bytes: null,
    mediaType: null,
    routeUses: [...routeUses].sort(),
    externalUrl
  }));
  return [...localRecords, ...externalRecords].sort((left, right) => left.id.localeCompare(right.id));
}

function removeUnreferencedManagedAssets(routes, baseRoot = root) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const referencedAssets = new Set(currentTypedAssetReferences(routes, baseRoot).local.keys());
  for (const directory of ['images/content', 'documents']) {
    for (const path of walk(resolve(outputAssetsRoot, directory))) {
      const localPath = `/assets/${relative(outputAssetsRoot, path).replaceAll(sep, '/')}`;
      if (!referencedAssets.has(localPath)) unlinkSync(path);
    }
  }
}

function canonicalizeAssetReferences(routes, baseRoot = root) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const candidatePaths = [...currentTypedAssetReferences(routes, baseRoot).local.keys()]
    .filter((localPath) => localPath.startsWith('/assets/images/content/'))
    .sort();
  const pathsByHash = new Map();
  for (const localPath of candidatePaths) {
    const path = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
    if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`missing referenced local asset: ${localPath}`);
    const sha256 = hash(readFileSync(path));
    if (!pathsByHash.has(sha256)) pathsByHash.set(sha256, localPath);
  }
  const aliases = new Map();
  for (const localPath of candidatePaths) {
    const path = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
    const canonical = pathsByHash.get(hash(readFileSync(path)));
    if (canonical !== localPath) aliases.set(localPath, canonical);
  }
  for (const route of routes.filter((route) => route.kind === 'included' && typedFamilies.has(route.family))) {
    const path = resolve(baseRoot, inputForRoute(route, route.family));
    let text = readFileSync(path, 'utf8');
    for (const [alias, canonical] of aliases) text = text.replaceAll(alias, canonical);
    writeFileSync(path, text);
  }
  for (const alias of aliases.keys()) unlinkSync(resolve(outputAssetsRoot, `.${alias.slice('/assets'.length)}`));
}

function cleanManagedOutputs(routeManifest, assetRecords, baseRoot = root) {
  const expectedInputs = new Set(routeManifest.routes
    .filter((route) => route.kind === 'included' && typedFamilies.has(route.family))
    .map((route) => inputForRoute(route, route.family)));
  for (const directory of Object.values(folderByFamily)) {
    for (const path of walk(resolve(baseRoot, directory))) {
      if (!expectedInputs.has(relative(baseRoot, path).replaceAll(sep, '/'))) rmSync(path);
    }
  }
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const expectedAssets = new Set(assetRecords.filter((record) => record.classification === 'local').map((record) => record.localPath));
  for (const directory of ['images/content', 'documents']) {
    const managedRoot = resolve(outputAssetsRoot, directory);
    for (const path of walk(managedRoot)) {
      const localPath = `/assets/${relative(outputAssetsRoot, path).replaceAll(sep, '/')}`;
      if (!expectedAssets.has(localPath)) rmSync(path);
    }
  }
}

function ensureStagedManagedPaths(stagingRoot) {
  for (const path of managedOutputPaths) {
    const destination = resolve(stagingRoot, path);
    mkdirSync(extname(path) ? dirname(destination) : destination, { recursive: true });
  }
}

function stageCurrentManagedOutputs(routeManifest, stagingRoot) {
  ensureStagedManagedPaths(stagingRoot);
  for (const route of routeManifest.routes.filter((route) => route.kind === 'included' && typedFamilies.has(route.family))) {
    const localInput = inputForRoute(route, route.family);
    const source = resolve(root, localInput);
    if (!existsSync(source)) throw new Error(`missing typed local input: ${localInput}`);
    const destination = resolve(stagingRoot, localInput);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination);
  }
  for (const path of ['public/assets/images/content', 'public/assets/documents']) {
    const source = resolve(root, path);
    if (existsSync(source)) cpSync(source, resolve(stagingRoot, path), { recursive: true });
  }
}

function buildStagedOutputs(routeManifest, stagingRoot) {
  removeUnreferencedManagedAssets(routeManifest.routes, stagingRoot);
  canonicalizeAssetReferences(routeManifest.routes, stagingRoot);
  const { manifest, errors } = buildContentManifest(routeManifest, stagingRoot);
  if (errors.length) throw new Error(errors.join('\n'));
  const assets = stableAssetRecords(routeManifest.routes, stagingRoot);
  cleanManagedOutputs(routeManifest, assets, stagingRoot);
  writeFileSync(resolve(stagingRoot, 'source-evidence/content-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(stagingRoot, 'source-evidence/asset-manifest.json'), `${JSON.stringify({ schemaVersion: 2, assets }, null, 2)}\n`);
  return manifest;
}

/**
 * @param {string} stagingRoot
 * @param {string} [outputRoot]
 * @param {readonly string[]} [paths]
 * @param {(from: string, to: string) => void} [rename]
 */
export function publishManagedOutputs(stagingRoot, outputRoot = root, paths = managedOutputPaths, rename = renameSync) {
  const backupRoot = resolve(outputRoot, `.content-materialize-backup-${process.pid}-${randomUUID()}`);
  const backups = [];
  const published = [];
  try {
    for (const path of paths) {
      const source = resolve(stagingRoot, path);
      const destination = resolve(outputRoot, path);
      if (!existsSync(source)) throw new Error(`missing staged managed output: ${path}`);
      if (existsSync(destination)) {
        const backup = resolve(backupRoot, path);
        mkdirSync(dirname(backup), { recursive: true });
        rename(destination, backup);
        backups.push({ destination, backup });
      }
      mkdirSync(dirname(destination), { recursive: true });
      rename(source, destination);
      published.push(destination);
    }
  } catch (error) {
    for (const destination of published.reverse()) rmSync(destination, { recursive: true, force: true });
    for (const { destination, backup } of backups.reverse()) {
      if (existsSync(backup)) rename(backup, destination);
    }
    throw error;
  } finally {
    rmSync(backupRoot, { recursive: true, force: true });
  }
}

export async function materializeContent(sourceOrigin, fetcher = fetch) {
  const origin = new URL(sourceOrigin).origin;
  if (origin !== sourceOrigin.replace(/\/$/, '') || !origin.startsWith('https://') || !approvedSourceHosts.has(new URL(origin).hostname)) {
    throw new Error('CONTENT_SOURCE_ORIGIN must be an approved HTTPS origin without a path');
  }
  const routeManifest = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  const included = routeManifest.routes.filter((route) => route.kind === 'included' && typedFamilies.has(route.family));
  const stagingRoot = transactionRoot();
  try {
    ensureStagedManagedPaths(stagingRoot);
    const outputAssetsRoot = assetsRootFor(stagingRoot);
    for (const route of included) {
      const response = await fetchApprovedResponse(new URL(route.path, origin), approvedSourceHosts, 'source', fetcher);
      if (!response.ok) throw new Error(`source fetch failed (${response.status}) for route ${route.path}`);
      const html = await response.text();
      const localInput = inputForRoute(route, route.family);
      const destination = resolve(stagingRoot, localInput);
      mkdirSync(dirname(destination), { recursive: true });
      if (localInput.endsWith('.md')) {
        const article = extractArticleContent(html);
        const localized = [];
        for (const [index, image] of article.images.entries()) localized.push(await localizeImage(image, route.path, index + 1, origin, outputAssetsRoot, fetcher));
        let body = article.body;
        for (const image of localized) body = body.replaceAll(image.source, image.localPath);
        writeFileSync(destination, `${frontmatter(article, localized[0]?.localPath ?? null, localized[0]?.alt ?? null)}${body}\n`);
      } else {
        const page = extractPageInput(route.path, html);
        if (route.family === 'annual-report-document') {
          for (const link of page.links.filter((link) => /\.pdf(?:[?#].*)?$/i.test(link.href))) {
            link.href = await localizeDocument(link.href, origin, outputAssetsRoot, fetcher);
          }
        }
        writeFileSync(destination, `${JSON.stringify(page, null, 2)}\n`);
      }
    }
    const manifest = buildStagedOutputs(routeManifest, stagingRoot);
    publishManagedOutputs(stagingRoot);
    return manifest;
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
}

export function migrateContent() {
  const routeManifest = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  const stagingRoot = transactionRoot();
  try {
    stageCurrentManagedOutputs(routeManifest, stagingRoot);
    const manifest = buildStagedOutputs(routeManifest, stagingRoot);
    publishManagedOutputs(stagingRoot);
    return manifest;
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const manifest = process.env.CONTENT_SOURCE_ORIGIN ? await materializeContent(process.env.CONTENT_SOURCE_ORIGIN) : migrateContent();
    console.log(`Migrated ${manifest.content.length} deterministic content manifest records.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
