import { parseFragment, serialize, type DefaultTreeAdapterTypes } from 'parse5';
import routeManifestInput from '../../source-evidence/route-manifest.json';
import { loadRouteManifest } from './route-manifest';

export type FigureAlignment = 'left' | 'right';

/**
 * How the archived source painted one body figure: which side it floated to
 * and, where the source displayed a crop rather than the whole image, the
 * displayed box and the focal point it cropped around.
 */
export type ArchivedFigure = {
  align: FigureAlignment;
  crop?: { width: number; height: number; focal: string };
};

type Node = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;
type ParentNode = DefaultTreeAdapterTypes.DocumentFragment | Element;

const routeManifest = loadRouteManifest(routeManifestInput);
const internalRoutes = new Map(routeManifest.routes.map((route) => [route.path, route]));
const EHF_HOSTS: Record<string, true> = { 'ehf.org': true, 'www.ehf.org': true };

function isElement(node: Node, tagName?: string): node is Element {
  return 'tagName' in node && (tagName === undefined || node.tagName === tagName);
}

function elementChildren(node: ParentNode): Element[] {
  return node.childNodes.filter((child): child is Element => isElement(child));
}

function textContent(node: Node): string {
  if ('value' in node) return node.value;
  if (!('childNodes' in node)) return '';
  return node.childNodes.map(textContent).join('');
}

function setAttribute(element: Element, name: string, value: string) {
  const attribute = element.attrs.find((candidate) => candidate.name === name);
  if (attribute) attribute.value = value;
  else element.attrs.push({ name, value });
}

function removeAttribute(element: Element, name: string) {
  element.attrs = element.attrs.filter((attribute) => attribute.name !== name);
}

function createElement(tagName: string, children: Node[]): Element {
  return {
    nodeName: tagName,
    tagName,
    attrs: [],
    namespaceURI: 'http://www.w3.org/1999/xhtml' as Element['namespaceURI'],
    parentNode: null,
    childNodes: children
  };
}

function nextElementSibling(parent: ParentNode, node: Node): Element | undefined {
  const index = parent.childNodes.indexOf(node);
  return parent.childNodes.slice(index + 1).find((candidate): candidate is Element => isElement(candidate));
}

function isAllowedSameSiteRoute(url: URL): LinkPolicy {
  const normalizedPath = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
  const route = internalRoutes.get(normalizedPath);
  if (!route || (route.kind !== 'included' && route.kind !== 'redirect')) return { kind: 'text' };
  return { kind: 'anchor', href: `${url.pathname}${url.search}${url.hash}`, external: false };
}

const HEADING_TAGS: Record<string, true> = { h1: true, h2: true, h3: true, h4: true, h5: true, h6: true };

/**
 * The archived article bodies were captured from pages whose previous/next
 * control is itself a heading, so a captured body can end with one or two
 * headings that repeat neighbouring article titles. The source never ends an
 * article body with a heading, and the layout renders that control itself, so
 * drop the captured copies instead of printing the titles twice.
 */
function dropCapturedPaginationHeadings(fragment: DefaultTreeAdapterTypes.DocumentFragment) {
  for (let removed = 0; removed < 2; removed += 1) {
    const rendered = elementChildren(fragment).filter((element) => !element.attrs.some((attribute) => attribute.name === 'hidden'));
    const last = rendered[rendered.length - 1];
    if (!last || !HEADING_TAGS[last.tagName]) return;
    const index = fragment.childNodes.indexOf(last);
    if (index < 0) return;
    fragment.childNodes.splice(index, 1);
  }
}

function promoteFigures(fragment: DefaultTreeAdapterTypes.DocumentFragment, archivedFigures: readonly (ArchivedFigure | null)[]) {
  for (const child of [...fragment.childNodes]) {
    if (!isElement(child, 'p')) continue;
    const children = elementChildren(child);
    const image = children[0];
    if (children.length !== 1 || !isElement(image, 'img') || textContent(child).trim()) continue;

    const figure = createElement('figure', [image]);
    const index = fragment.childNodes.indexOf(child);
    if (index >= 0) fragment.childNodes[index] = figure;
    const captionParagraph = nextElementSibling(fragment, figure);
    const captionChildren = captionParagraph ? elementChildren(captionParagraph) : [];
    const captionSource = captionChildren[0];
    if (
      captionParagraph &&
      captionChildren.length === 1 &&
      isElement(captionSource, 'em') &&
      textContent(captionParagraph).trim()
    ) {
      const caption = createElement('figcaption', [captionSource]);
      figure.childNodes.push(caption);
      const captionIndex = fragment.childNodes.indexOf(captionParagraph);
      if (captionIndex >= 0) fragment.childNodes.splice(captionIndex, 1);
    }
  }

  const figures = fragment.childNodes.filter((child): child is Element => isElement(child, 'figure'));
  for (const [index, archived] of archivedFigures.entries()) {
    const figure = figures[index];
    if (!archived || !figure) continue;
    setAttribute(figure, 'data-archived-align', archived.align);
    if (archived.crop) {
      setAttribute(figure, 'style', `--figure-crop: ${archived.crop.width} / ${archived.crop.height}; --figure-focal: ${archived.crop.focal};`);
    }
  }
}

type LinkPolicy =
  | { kind: 'anchor'; href: string; external: boolean }
  | { kind: 'text' };

function linkPolicy(value: string | undefined): LinkPolicy {
  if (!value) return { kind: 'text' };
  if (value.startsWith('#')) return { kind: 'anchor', href: value, external: false };

  if (!value.startsWith('/') && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) return { kind: 'text' };

  let url: URL;
  try {
    url = new URL(value, 'https://ehf.org');
  } catch {
    return { kind: 'text' };
  }

  if (EHF_HOSTS[url.hostname]) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'text' };
    if (url.username || url.password || url.port) return { kind: 'text' };
    return isAllowedSameSiteRoute(url);
  }

  if (url.protocol === 'https:') return { kind: 'anchor', href: url.href, external: true };
  if (url.protocol === 'mailto:') return { kind: 'anchor', href: value, external: false };
  return { kind: 'text' };
}

function applyLinkPolicy(node: ParentNode | Node) {
  if (!('childNodes' in node)) return;
  for (const child of [...node.childNodes]) {
    if (isElement(child, 'a')) {
      const href = child.attrs.find((attribute) => attribute.name === 'href')?.value;
      const policy = linkPolicy(href);
      if (policy.kind === 'text') {
        const index = node.childNodes.indexOf(child);
        if (index >= 0) node.childNodes.splice(index, 1, ...child.childNodes);
        continue;
      }
      setAttribute(child, 'href', policy.href);
      if (policy.external) {
        setAttribute(child, 'target', '_blank');
        setAttribute(child, 'rel', 'noopener noreferrer');
      } else {
        removeAttribute(child, 'target');
        removeAttribute(child, 'rel');
      }
    }
    applyLinkPolicy(child);
  }
}

/**
 * Applies the site-wide policy for links captured from authored Markdown.
 * Keep this as the single policy boundary for every server-rendered article
 * family so unsafe or unavailable source destinations never become links.
 */
export function sanitizeArticleLinks(html: string): string {
  const fragment = parseFragment(html);
  applyLinkPolicy(fragment);
  return serialize(fragment);
}

export function renderArticleBody(html: string, archivedFigures: readonly (ArchivedFigure | null)[]): string {
  const fragment = parseFragment(html);
  dropCapturedPaginationHeadings(fragment);
  promoteFigures(fragment, archivedFigures);
  return sanitizeArticleLinks(serialize(fragment));
}
