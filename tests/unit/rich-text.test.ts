import { expect, test } from 'vitest';
import { parseRichText, renderInlineHtml } from '../../src/lib/rich-text';

test('preserves headings, lists, strong emphasis, and links from imported page text', () => {
  expect(parseRichText('# Our story')).toEqual({ kind: 'heading', level: 1, children: [{ kind: 'text', value: 'Our story' }] });
  expect(parseRichText('- **Information you provide.** *Application* [here](/terms-of-use)')).toEqual({
    kind: 'list-item',
    ordered: false,
    children: [
      { kind: 'strong', children: [{ kind: 'text', value: 'Information you provide.' }] },
      { kind: 'text', value: ' ' },
      { kind: 'emphasis', children: [{ kind: 'text', value: 'Application' }] },
      { kind: 'text', value: ' ' },
      { kind: 'link', href: '/terms-of-use', children: [{ kind: 'text', value: 'here' }] }
    ]
  });
});

test('renders semantic inline elements without normalizing link destinations', () => {
  const block = parseRichText('**EHF** *Application Terms* [here](/terms-of-use)');
  if (block.kind === 'image') throw new Error('expected inline text block');
  expect(renderInlineHtml(block.children)).toBe('<strong>EHF</strong> <em>Application Terms</em> <a href="/terms-of-use">here</a>');
});
