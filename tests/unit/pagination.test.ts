import { expect, test } from 'vitest';
import { paginate } from '../../src/lib/pagination';

test('partitions immutable input in its existing stable order without duplicates', () => {
  const items = Object.freeze(['first', 'second', 'third', 'fourth', 'fifth']);

  const pages = paginate(items, 2);

  expect(pages).toEqual([['first', 'second'], ['third', 'fourth'], ['fifth']]);
  expect(items).toEqual(['first', 'second', 'third', 'fourth', 'fifth']);
  expect(new Set(pages.flat())).toEqual(new Set(items));
});

test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid page size %p', (pageSize) => {
  expect(() => paginate(['entry'], pageSize)).toThrow('Page size must be a positive integer');
});

test('returns no pages for an empty collection', () => {
  expect(paginate([], 20)).toEqual([]);
});
