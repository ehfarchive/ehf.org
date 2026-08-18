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
const typedFamilies = new Set(['impact-article', 'watch-article', 'fellows-article', 'news-article', 'event-programme', 'annual-report-document', 'fellows-news-snapshot', 'institutional', 'contact-media-donation', 'legal']);
const generatedFamilies = new Set(['homepage', 'impact-landing', 'impact-listing', 'watch-listing', 'news-listing', 'fellows-article-listing', 'archive', 'not-found']);
const folderByFamily = {
  'impact-article': 'src/content/impact',
  'watch-article': 'src/content/watch',
  'fellows-article': 'src/content/fellows-articles',
  'news-article': 'src/content/news',
  'event-programme': 'src/content/events',
  'fellows-news-snapshot': 'src/content/snapshots',
  'institutional': 'src/content/pages/institutional',
  'legal': 'src/content/pages/legal',
  'annual-report-document': 'src/content/pages/reports',
  'contact-media-donation': 'src/content/pages/contact-media-donation'
};
const extensionByFamily = {
  'impact-article': '.md',
  'watch-article': '.md',
  'fellows-article': '.md',
  'news-article': '.md',
  'event-programme': '.md',
  'fellows-news-snapshot': '.md',
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
  const prefix = family === 'impact-article' ? '/read/' : family === 'watch-article' ? '/watch/' : family === 'fellows-article' ? '/ehf-fellows-articles/' : family === 'news-article' ? '/news-blog/' : '/';
  const sourceIdentity = route.path.slice(prefix.length);
  const identity = family === 'fellows-article'
    ? decodeURIComponent(sourceIdentity).toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : sourceIdentity.replaceAll('/', '-');
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
  if (typeof value !== 'string') return null;
  const cleaned = stripTrailingHrefArtifacts(value).trim();
  if (!cleaned) return null;
  if (/^(?:mailto:|tel:)/i.test(cleaned)) return cleaned;
  const absolute = cleaned.startsWith('//') ? `https:${cleaned}` : cleaned;
  try {
    const url = new URL(absolute, 'https://www.ehf.org');
    if (['www.ehf.org', 'orb-parrotfish-n735.squarespace.com'].includes(url.hostname)) {
      return stripTrailingHrefArtifacts(`${url.pathname}${url.search}${url.hash}`);
    }
    if (url.hostname === 'images.squarespace-cdn.com' || url.hostname === 'static1.squarespace.com' || url.hostname.endsWith('.squarespace.com')) return null;
    return url.protocol === 'https:' && /^[a-z][a-z0-9+.-]*:/i.test(absolute) ? url.toString() : null;
  } catch { return null; }
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
  const content = normalize(text);
  const leadingWhitespace = /^\s/u.test(text) ? ' ' : '';
  const trailingWhitespace = /\s$/u.test(text) ? ' ' : '';
  if (node.tagName === 'strong' || node.tagName === 'b') return `${leadingWhitespace}**${content}**${trailingWhitespace}`;
  if (node.tagName === 'em' || node.tagName === 'i') return `${leadingWhitespace}*${content}*${trailingWhitespace}`;
  return text;
}

function assertNoUnsupportedBlocks(scope) {
  const unsupported = findFirst(scope, (node) => unsupportedTags.has(node.tagName));
  if (unsupported) throw new Error(`unsupported source block: ${unsupported.tagName}`);
}

function imageSource(node) {
  return attribute(node, 'data-src') ?? attribute(node, 'src');
}

function hasAncestorClass(node, className) {
  for (let current = node.parentNode; current; current = current.parentNode) {
    if ((attribute(current, 'class') ?? '').split(/\s+/).includes(className)) return true;
  }
  return false;
}
function markdownBlocks(scope, options = {}) {
  const blocks = [];
  const emittedImageSources = new Set();
  const appendImage = (image) => {
    if (hasAncestorClass(image, 'author-avatar')) return;
    const src = imageSource(image);
    if (!src || src.startsWith('data:') || emittedImageSources.has(src)) return;
    emittedImageSources.add(src);
    blocks.push(`![${attribute(image, 'alt') ?? ''}](${src})`);
  };
  let firstH1 = true;
  const visit = (node) => {
    if (node.tagName === 'iframe') {
      const rawSrc = attribute(node, 'src');
      const src = outputHref(rawSrc?.startsWith('//') ? `https:${rawSrc}` : rawSrc);
      if (!src) throw new Error('unsupported source block: iframe');
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
    if (node.tagName === 'img') {
      appendImage(node);
      return;
    }
    if (node.tagName === 'figure') {
      const image = findFirst(node, (child) => child.tagName === 'img');
      if (image) appendImage(image);
      const caption = findFirst(node, (child) => child.tagName === 'figcaption');
      if (caption) blocks.push(`*${normalize(inlineMarkdown(caption))}*`);
      return;
    }
    for (const child of children(node)) visit(child);
  };
  visit(scope);
  return blocks;
}

function articleScope(html, options = {}) {
  const document = parse(html);
  const scope = options.preferArticle
    ? findFirst(document, (node) => node.tagName === 'article') ?? findFirst(document, (node) => node.tagName === 'main')
    : findFirst(document, (node) => node.tagName === 'main') ?? findFirst(document, (node) => node.tagName === 'article');
  const readableScope = scope ?? findFirst(document, (node) => node.tagName === 'body');
  if (!readableScope) throw new Error('source page has no readable content root');
  assertNoUnsupportedBlocks(readableScope);
  return { document, scope: readableScope };
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

function socialImageFor(document, title) {
  const image = findFirst(document, (node) => node.tagName === 'meta' && attribute(node, 'property') === 'og:image');
  const src = image ? attribute(image, 'content')?.replace(/^http:/, 'https:').replace(/^\/\//, 'https://') : null;
  if (!src) return null;
  const altMetadata = findFirst(document, (node) => node.tagName === 'meta' && attribute(node, 'property') === 'og:image:alt');
  return {
    src,
    alt: normalize(altMetadata ? attribute(altMetadata, 'content') ?? '' : '') || title
  };
}

export function extractArticleContent(html) {
  const { document, scope } = articleScope(html, { preferArticle: true });
  const title = titleFor(document, scope);
  if (!title) throw new Error('source article has no title');
  const paragraphs = findAll(scope, (node) => node.tagName === 'p').map((node) => normalize(inlineMarkdown(node))).filter(Boolean);
  const body = markdownBlocks(scope).join('\n\n');
  const markdownImageSources = new Set([...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((match) => match[1]));
  const images = [];
  const imageSources = new Set();
  for (const image of findAll(scope, (node) => node.tagName === 'img')) {
    const src = imageSource(image);
    if (!src || src.startsWith('data:') || !markdownImageSources.has(src) || imageSources.has(src)) continue;
    imageSources.add(src);
    images.push({ src, alt: attribute(image, 'alt') ?? '' });
  }
  return {
    title,
    excerpt: paragraphs[0] ?? '',
    body,
    publishedAt: publishedAtFor(document, scope),
    socialImage: socialImageFor(document, title),
    images,
    externalUrls: findAll(scope, (node) => node.tagName === 'iframe').map((frame) => outputHref(attribute(frame, 'src'))).filter(Boolean)
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
  /* A body paragraph holding a single non-breaking space is a source spacer
     block; every other paragraph must carry copy. */
  if (['institutional', 'legal', 'annual-report-document'].includes(family)
    && (!value.title.trim() || !value.description.trim() || !value.heading.trim() || !Array.isArray(value.body) || value.body.length === 0 || value.body.some((paragraph) => paragraph !== '\u00a0' && !paragraph.trim()))) {
    errors.push('page input needs non-empty description and body');
  }
  if (family === 'contact-media-donation'
    && (!value.title.trim() || !value.heading.trim() || !Array.isArray(value.body) || value.body.length === 0 || value.body.some((paragraph) => paragraph !== '\u00a0' && !paragraph.trim()))) {
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

async function localizeImage(image, route, ordinal, origin, outputAssetsRoot, fetcher, localizedBySource = new Map()) {
  const source = new URL(image.src, origin).toString();
  const existing = localizedBySource.get(source);
  if (existing) return { ...existing, alt: image.alt, rawSource: image.src };
  const { bytes, response } = await fetchBytes(source, fetcher);
  const mediaType = mediaTypeFor(source, response);
  const localPath = assetPath(route, ordinal, mediaType);
  const destination = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, bytes);
  const localized = { source, localPath, mediaType, sha256: hash(bytes), bytes: bytes.length };
  localizedBySource.set(source, localized);
  return { ...localized, alt: image.alt, rawSource: image.src };
}

function frontmatter(article, heroImage, heroAlt, listingImage = null, listingAlt = null) {
  const publishedAt = article.publishedAt ? `publishedAt: ${JSON.stringify(article.publishedAt)}\n` : '';
  const listing = listingImage === null ? '' : `listingImage: ${JSON.stringify(listingImage)}\nlistingAlt: ${JSON.stringify(listingAlt ?? article.title)}\n`;
  return `---\ntitle: ${JSON.stringify(article.title)}\nexcerpt: ${JSON.stringify(article.excerpt)}\nheroImage: ${heroImage === null ? 'null' : JSON.stringify(heroImage)}\nheroAlt: ${heroAlt === null ? 'null' : JSON.stringify(heroAlt)}\n${listing}${publishedAt}---\n\n`;
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

function sourceAssetReferences() {
  const references = new Set();
  const contentRoot = `${resolve(root, 'src/content')}${sep}`;
  for (const path of walk(resolve(root, 'src'))) {
    if (path.startsWith(contentRoot)) continue;
    const text = readFileSync(path, 'utf8');
    for (const match of text.matchAll(/\/assets\/[a-z0-9][a-z0-9_./-]*\.[a-z0-9]+/gi)) references.add(match[0]);
  }
  return references;
}

function preservedManagedAssetPaths(routes) {
  const generatedRoutes = new Set(routes
    .filter((route) => route.kind === 'included' && !typedFamilies.has(route.family))
    .map((route) => route.path));
  const preserved = sourceAssetReferences();
  const manifest = JSON.parse(readFileSync(assetManifestPath, 'utf8'));
  for (const record of manifest.assets) {
    if (record.classification === 'local' && record.routeUses.some((route) => generatedRoutes.has(route))) {
      preserved.add(record.localPath);
    }
  }
  return preserved;
}

function stableAssetRecords(routes, baseRoot = root) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const directlyReferencedAssets = preservedManagedAssetPaths(routes);
  const preservedStaticAssets = JSON.parse(readFileSync(assetManifestPath, 'utf8')).assets.filter((record) =>
    record.classification === 'local'
    && (
      (!record.localPath.startsWith('/assets/images/content/') && !record.localPath.startsWith('/assets/documents/'))
      || directlyReferencedAssets.has(record.localPath)
    )
  );
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
  return [...preservedStaticAssets, ...localRecords, ...externalRecords].sort((left, right) => left.id.localeCompare(right.id));
}

function mergedAssetRecords(routes, baseRoot = root, refreshedRoutes = []) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const refreshedPaths = new Set(refreshedRoutes.map((route) => route.path));
  const existing = JSON.parse(readFileSync(assetManifestPath, 'utf8')).assets;
  const records = new Map(existing.map((record) => {
    const routeUses = new Set(record.routeUses.filter((route) => !refreshedPaths.has(route)));
    return [record.id, { ...record, routeUses }];
  }));
  const localRecords = new Map(existing.filter((record) => record.classification === 'local').map((record) => [record.localPath, records.get(record.id)]));
  const externalRecords = new Map(existing.filter((record) => record.classification === 'external').map((record) => [record.externalUrl, records.get(record.id)]));
  const references = currentTypedAssetReferences(routes, baseRoot);
  for (const [localPath, routeUses] of references.local) {
    let record = localRecords.get(localPath);
    if (!record) {
      const path = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
      if (!path.startsWith(`${outputAssetsRoot}${sep}`) || !existsSync(path) || !statSync(path).isFile()) throw new Error(`missing referenced local asset: ${localPath}`);
      const bytes = readFileSync(path);
      record = {
        id: `asset-${localPath.slice('/assets/'.length).replaceAll(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`,
        classification: 'local',
        localPath,
        sha256: hash(bytes),
        bytes: bytes.length,
        mediaType: mediaTypeFor(path),
        routeUses: new Set(),
        externalUrl: null
      };
      if (records.has(record.id)) throw new Error(`asset id collision: ${record.id}`);
      records.set(record.id, record);
      localRecords.set(localPath, record);
    }
    for (const route of routeUses) record.routeUses.add(route);
  }
  for (const [externalUrl, routeUses] of references.external) {
    let record = externalRecords.get(externalUrl);
    if (!record) {
      record = {
        id: externalAssetId(externalUrl),
        classification: 'external',
        localPath: null,
        sha256: null,
        bytes: null,
        mediaType: null,
        routeUses: new Set(),
        externalUrl
      };
      if (records.has(record.id)) throw new Error(`asset id collision: ${record.id}`);
      records.set(record.id, record);
      externalRecords.set(externalUrl, record);
    }
    for (const route of routeUses) record.routeUses.add(route);
  }
  for (const localPath of [
    '/assets/documents/the-hillary-institute-of-international-leadership-2025-performance-report-and-unqualified-audit-report.pdf',
    '/assets/documents/ehf-hi-annual-report-2024.pdf',
    '/assets/documents/the-hillary-institute-of-international-leadership-2024-authorised-performance-report-including-audit-report.pdf'
  ]) {
    if (localRecords.has(localPath)) continue;
    const path = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
    if (!existsSync(path)) continue;
    const bytes = readFileSync(path);
    const record = {
      id: `asset-${localPath.slice('/assets/'.length).replaceAll(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`,
      classification: 'local',
      localPath,
      sha256: hash(bytes),
      bytes: bytes.length,
      mediaType: mediaTypeFor(path),
      routeUses: new Set(['/archive']),
      externalUrl: null
    };
    if (records.has(record.id)) throw new Error(`asset id collision: ${record.id}`);
    records.set(record.id, record);
    localRecords.set(localPath, record);
  }
  return [...records.values()]
    .filter((record) => record.routeUses.size > 0)
    .map((record) => ({ ...record, routeUses: [...record.routeUses].sort() }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function canonicalizeTargetImageReferences(routes, targetRoutes, baseRoot = root) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const targetPaths = new Set(targetRoutes.map((route) => route.path));
  const references = currentTypedAssetReferences(routes, baseRoot);
  const routeUsesByAsset = references.local;
  const candidatePaths = [...routeUsesByAsset.keys()]
    .filter((localPath) => localPath.startsWith('/assets/images/content/'))
    .sort();
  const canonicalByHash = new Map();
  for (const localPath of candidatePaths.filter((path) => [...routeUsesByAsset.get(path)].some((route) => !targetPaths.has(route)))) {
    const path = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
    canonicalByHash.set(hash(readFileSync(path)), localPath);
  }
  const aliases = new Map();
  for (const localPath of candidatePaths.filter((path) => [...routeUsesByAsset.get(path)].every((route) => targetPaths.has(route)))) {
    const path = resolve(outputAssetsRoot, `.${localPath.slice('/assets'.length)}`);
    const sha256 = hash(readFileSync(path));
    const canonical = canonicalByHash.get(sha256) ?? localPath;
    canonicalByHash.set(sha256, canonical);
    if (canonical !== localPath) aliases.set(localPath, canonical);
  }
  if (aliases.size === 0) return;
  for (const route of targetRoutes) {
    const path = resolve(baseRoot, inputForRoute(route, route.family));
    let text = readFileSync(path, 'utf8');
    for (const [alias, canonical] of aliases) text = text.replaceAll(alias, canonical);
    writeFileSync(path, text);
  }
  for (const alias of aliases.keys()) unlinkSync(resolve(outputAssetsRoot, `.${alias.slice('/assets'.length)}`));
}

function removeUnreferencedTargetImages(routes, targetRoutes, baseRoot = root) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const referencedAssets = new Set(currentTypedAssetReferences(routes, baseRoot).local.keys());
  for (const route of targetRoutes) {
    const prefix = `${route.path.slice(1).replaceAll('/', '-')}-`;
    for (const path of walk(resolve(outputAssetsRoot, 'images/content'))) {
      const localPath = `/assets/${relative(outputAssetsRoot, path).replaceAll(sep, '/')}`;
      if (basename(path).startsWith(prefix) && !referencedAssets.has(localPath)) unlinkSync(path);
    }
  }
}

function buildTargetedStagedOutputs(routeManifest, stagingRoot, targetRoutes) {
  canonicalizeTargetImageReferences(routeManifest.routes, targetRoutes, stagingRoot);
  removeUnreferencedTargetImages(routeManifest.routes, targetRoutes, stagingRoot);
  const { manifest, errors } = buildContentManifest(routeManifest, stagingRoot);
  if (errors.length) throw new Error(errors.join('\n'));
  const assets = mergedAssetRecords(routeManifest.routes, stagingRoot, targetRoutes);
  writeFileSync(resolve(stagingRoot, 'source-evidence/content-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(stagingRoot, 'source-evidence/asset-manifest.json'), `${JSON.stringify({ schemaVersion: 2, assets }, null, 2)}\n`);
  return manifest;
}

function removeUnreferencedManagedAssets(routes, baseRoot = root) {
  const outputAssetsRoot = assetsRootFor(baseRoot);
  const referencedAssets = new Set([
    ...currentTypedAssetReferences(routes, baseRoot).local.keys(),
    ...preservedManagedAssetPaths(routes)
  ]);
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

function stageCurrentManagedOutputs(routeManifest, stagingRoot, allowMissingInputs = false) {
  ensureStagedManagedPaths(stagingRoot);
  for (const route of routeManifest.routes.filter((route) => route.kind === 'included' && typedFamilies.has(route.family))) {
    const localInput = inputForRoute(route, route.family);
    const source = resolve(root, localInput);
    if (!existsSync(source)) {
      if (allowMissingInputs) continue;
      throw new Error(`missing typed local input: ${localInput}`);
    }
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
function materializationRoutes(routeManifest, targetPaths) {
  const included = routeManifest.routes.filter((route) => route.kind === 'included' && typedFamilies.has(route.family));
  if (targetPaths === undefined) return included;
  if (!Array.isArray(targetPaths) || targetPaths.length === 0 || targetPaths.some((path) => typeof path !== 'string')) {
    throw new Error('target materialization paths must be a non-empty string array');
  }
  const routesByPath = new Map(included.map((route) => [route.path, route]));
  const selected = targetPaths.map((path) => routesByPath.get(path));
  if (selected.some((route) => !route) || new Set(targetPaths).size !== targetPaths.length) {
    throw new Error('target materialization paths must be unique manifest-included typed routes');
  }
  return selected;
}

export async function materializeContent(sourceOrigin, fetcher = fetch, targetPaths = undefined) {
  const origin = new URL(sourceOrigin).origin;
  if (origin !== sourceOrigin.replace(/\/$/, '') || !origin.startsWith('https://') || !approvedSourceHosts.has(new URL(origin).hostname)) {
    throw new Error('CONTENT_SOURCE_ORIGIN must be an approved HTTPS origin without a path');
  }
  const routeManifest = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  const included = materializationRoutes(routeManifest, targetPaths);
  const targeted = targetPaths !== undefined;
  const stagingRoot = transactionRoot();
  try {
    if (targeted) stageCurrentManagedOutputs(routeManifest, stagingRoot, true);
    else ensureStagedManagedPaths(stagingRoot);
    const outputAssetsRoot = assetsRootFor(stagingRoot);
    const localizedBySource = new Map();
    for (const route of included) {
      const response = await fetchApprovedResponse(new URL(route.path, origin), approvedSourceHosts, 'source', fetcher);
      if (!response.ok) throw new Error(`source fetch failed (${response.status}) for route ${route.path}`);
      const html = await response.text();
      const localInput = inputForRoute(route, route.family);
      const destination = resolve(stagingRoot, localInput);
      mkdirSync(dirname(destination), { recursive: true });
      if (localInput.endsWith('.md')) {
        const article = extractArticleContent(html);
        const listingImage = route.family === 'news-article' && article.socialImage
          ? await localizeImage(article.socialImage, route.path, 1, origin, outputAssetsRoot, fetcher, localizedBySource)
          : null;
        const localized = [];
        for (const [index, image] of article.images.entries()) {
          localized.push(await localizeImage(image, route.path, index + (listingImage ? 2 : 1), origin, outputAssetsRoot, fetcher, localizedBySource));
        }
        let body = article.body;
        for (const image of localized) {
          body = body.replaceAll(image.rawSource, image.localPath).replaceAll(image.source, image.localPath);
        }
        if (/!\[[^\]]*\]\((?:https?:)?\/\//i.test(body)) throw new Error(`unlocalized image in ${route.path}`);
        writeFileSync(destination, `${frontmatter(
          article,
          route.family === 'news-article' ? null : localized[0]?.localPath ?? null,
          route.family === 'news-article' ? null : localized[0]?.alt ?? null,
          listingImage?.localPath ?? null,
          listingImage?.alt ?? null
        )}${body}\n`);
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
    const manifest = targeted ? buildTargetedStagedOutputs(routeManifest, stagingRoot, included) : buildStagedOutputs(routeManifest, stagingRoot);
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
    const targetPaths = process.env.CONTENT_SOURCE_PATHS === undefined ? undefined : JSON.parse(process.env.CONTENT_SOURCE_PATHS);
    const manifest = process.env.CONTENT_SOURCE_ORIGIN
      ? await materializeContent(process.env.CONTENT_SOURCE_ORIGIN, fetch, targetPaths)
      : migrateContent();
    console.log(`Migrated ${manifest.content.length} deterministic content manifest records.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
