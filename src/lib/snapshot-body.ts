import { parseFragment, serialize, type DefaultTreeAdapterTypes } from 'parse5';
import { sanitizeArticleLinks } from './article-body';

type Node = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;

function isElement(node: Node, tagName?: string): node is Element {
  return 'tagName' in node && (tagName === undefined || node.tagName === tagName);
}


function textContent(node: Node): string {
  if ('value' in node) return node.value;
  if (!('childNodes' in node)) return '';
  return node.childNodes.map(textContent).join('');
}

function createElement(tagName: string, className: string | undefined, children: Node[]): Element {
  return {
    nodeName: tagName,
    tagName,
    attrs: className ? [{ name: 'class', value: className }] : [],
    namespaceURI: 'http://www.w3.org/1999/xhtml' as Element['namespaceURI'],
    parentNode: null,
    childNodes: children
  };
}


function promoteFigures(fragment: DefaultTreeAdapterTypes.DocumentFragment) {
  for (const child of [...fragment.childNodes]) {
    if (!isElement(child, 'p')) continue;
    const children = child.childNodes.filter((candidate): candidate is Element => isElement(candidate));
    const image = children[0];
    if (children.length !== 1 || !isElement(image, 'img') || textContent(child).trim()) continue;

    const figure = createElement('figure', undefined, [image]);
    const index = fragment.childNodes.indexOf(child);
    if (index >= 0) fragment.childNodes[index] = figure;
    const figureIndex = fragment.childNodes.indexOf(figure);
    const captionParagraph = fragment.childNodes.slice(figureIndex + 1).find((candidate): candidate is Element => isElement(candidate));
    const captionChildren = captionParagraph ? captionParagraph.childNodes.filter((candidate): candidate is Element => isElement(candidate)) : [];
    const captionSource = captionChildren[0];
    if (
      captionParagraph &&
      captionChildren.length === 1 &&
      isElement(captionSource, 'em') &&
      textContent(captionParagraph).trim()
    ) {
      figure.childNodes.push(createElement('figcaption', undefined, [captionSource]));
      const captionIndex = fragment.childNodes.indexOf(captionParagraph);
      if (captionIndex >= 0) fragment.childNodes.splice(captionIndex, 1);
    }
  }
}

function isHeading(node: Node): node is Element {
  return isElement(node) && /^h[1-6]$/.test(node.tagName);
}


interface SnapshotBodyOptions {
  stripMasthead?: boolean;
}

/**
 * Converts a rendered snapshot Markdown fragment into source-style editorial
 * groups. A story begins with one or more adjacent figures and keeps those
 * figures with the copy before the next figure or heading.
 */
export function groupSnapshotBody(html: string, { stripMasthead = false }: SnapshotBodyOptions = {}): string {
  const fragment = parseFragment(sanitizeArticleLinks(html));
  promoteFigures(fragment);
  let nodes = fragment.childNodes.filter((node) => isElement(node) || textContent(node).trim().length > 0);
  if (stripMasthead) {
    let removedMasthead = false;
    if (isElement(nodes[0], 'h1')) {
      nodes = nodes.slice(1);
      removedMasthead = true;
    }
    if (isElement(nodes[0], 'h4')) {
      nodes = nodes.slice(1);
      removedMasthead = true;
    }
    if (removedMasthead && isElement(nodes[0], 'p')) nodes = nodes.slice(1);
  }
  const output: Node[] = [];
  let currentSection: Element | undefined;

  const section = () => {
    if (!currentSection) {
      currentSection = createElement('section', 'snapshot-section', []);
      output.push(currentSection);
    }
    return currentSection;
  };

  for (let index = 0; index < nodes.length;) {
    const node = nodes[index];
    if (isHeading(node)) {
      if (node.tagName === 'h1') {
        node.tagName = 'h2';
        node.nodeName = 'h2';
      }
      if (node.tagName === 'h2') {
        currentSection = createElement('section', 'snapshot-section', [node]);
        output.push(currentSection);
      } else {
        section().childNodes.push(node);
      }
      index += 1;
      continue;
    }

    if (!isElement(node, 'figure')) {
      section().childNodes.push(node);
      index += 1;
      continue;
    }

    const figures: Node[] = [];
    while (index < nodes.length && isElement(nodes[index], 'figure')) {
      figures.push(nodes[index]);
      index += 1;
    }

    const copy: Node[] = [];
    while (index < nodes.length && !isHeading(nodes[index]) && !isElement(nodes[index], 'figure')) {
      copy.push(nodes[index]);
      index += 1;
    }

    const story = createElement('section', 'snapshot-story', [
      createElement('div', 'snapshot-story__media', figures),
      createElement('div', 'snapshot-story__copy', copy)
    ]);
    section().childNodes.push(story);
  }

  fragment.childNodes = output;
  return serialize(fragment);
}

export function snapshotMonthLabel(title: string, publishedAt?: string, bodyHtml?: string): string | undefined {
  if (publishedAt) {
    const date = new Date(`${publishedAt}T00:00:00.000Z`);
    if (!Number.isNaN(date.valueOf())) {
      return new Intl.DateTimeFormat('en-NZ', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
    }
  }

  const titleLabel = /\(([^()]+)\)\s*$/.exec(title)?.[1]?.trim();
  if (titleLabel) return titleLabel;
  if (!bodyHtml) return undefined;

  const monthHeading = parseFragment(bodyHtml).childNodes.find((node): node is Element => isElement(node, 'h4'));
  return monthHeading ? textContent(monthHeading).trim() || undefined : undefined;
}

export function snapshotIntro(bodyHtml: string): string | undefined {
  const nodes = parseFragment(bodyHtml).childNodes.filter((node) => isElement(node) || textContent(node).trim().length > 0);
  const monthIndex = nodes.findIndex((node) => isElement(node, 'h4'));
  if (monthIndex < 0) return undefined;
  const intro = nodes.slice(monthIndex + 1).find((node): node is Element => isElement(node, 'p'));
  return intro ? textContent(intro).trim() || undefined : undefined;
}
