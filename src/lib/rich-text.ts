export type RichTextNode =
  | { kind: 'text'; value: string }
  | { kind: 'strong' | 'emphasis'; children: RichTextNode[] }
  | { kind: 'link'; href: string; children: RichTextNode[] };

export type RichTextBlock =
  | { kind: 'paragraph'; children: RichTextNode[] }
  | { kind: 'heading'; level: number; children: RichTextNode[] }
  | { kind: 'list-item'; ordered: boolean; children: RichTextNode[] };

const pushText = (nodes: RichTextNode[], value: string) => {
  if (!value) return;
  const previous = nodes.at(-1);
  if (previous?.kind === 'text') previous.value += value;
  else nodes.push({ kind: 'text', value });
};

function parseInline(value: string): RichTextNode[] {
  const nodes: RichTextNode[] = [];
  let index = 0;
  while (index < value.length) {
    const link = value.slice(index).match(/^\[([^\]]+)\]\(([^)]*)\)/);
    if (link) {
      nodes.push({ kind: 'link', href: link[2], children: parseInline(link[1]) });
      index += link[0].length;
      continue;
    }
    const marker = value.startsWith('***', index) ? '***' : value.startsWith('**', index) ? '**' : value[index] === '*' ? '*' : null;
    if (marker) {
      const closing = value.indexOf(marker, index + marker.length);
      if (closing > index + marker.length) {
        const children = parseInline(value.slice(index + marker.length, closing));
        if (marker === '***') nodes.push({ kind: 'strong', children: [{ kind: 'emphasis', children }] });
        else nodes.push({ kind: marker === '**' ? 'strong' : 'emphasis', children });
        index = closing + marker.length;
        continue;
      }
    }
    pushText(nodes, value[index]);
    index += 1;
  }
  return nodes;
}

export function parseRichText(value: string): RichTextBlock {
  const heading = value.match(/^(#{1,6})\s+(.+)$/);
  if (heading) return { kind: 'heading', level: heading[1].length, children: parseInline(heading[2]) };
  const strongHeading = value.match(/^\*\*(.+)\*\*$/);
  if (strongHeading) return { kind: 'heading', level: 3, children: parseInline(strongHeading[1]) };
  const item = value.match(/^\s*((?:\d+)\.|[-+*])\s+(.+)$/);
  if (item) return { kind: 'list-item', ordered: /^\d+\.$/.test(item[1]), children: parseInline(item[2]) };
  return { kind: 'paragraph', children: parseInline(value) };
}

export function inlineText(nodes: readonly RichTextNode[]): string {
  return nodes.map((node) => node.kind === 'text' ? node.value : inlineText(node.children)).join('');
}

export function renderInlineHtml(nodes: readonly RichTextNode[]): string {
  return nodes.map((node) => {
    if (node.kind === 'text') return node.value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const content = renderInlineHtml(node.children);
    if (node.kind === 'strong') return `<strong>${content}</strong>`;
    if (node.kind === 'emphasis') return `<em>${content}</em>`;
    if (node.kind === 'link') {
      const href = node.href.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
      const externalAttributes = /^https?:\/\//.test(node.href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${href}"${externalAttributes}>${content}</a>`;
    }
    return '';
  }).join('');
}
