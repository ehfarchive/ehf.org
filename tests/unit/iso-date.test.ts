import { describe, expect, test } from 'vitest';
import { parseStrictUtcIsoDate } from '../../src/lib/iso-date';

describe('parseStrictUtcIsoDate', () => {
  test.each(['2024-02-31', '2023-02-29', '2024-00-01', '2024-13-01'])('rejects impossible calendar date %s', (value) => {
    expect(() => parseStrictUtcIsoDate(value, 'News entry test-entry.publishedAt'))
      .toThrow('News entry test-entry.publishedAt must be a valid ISO calendar date');
  });

  test.each([
    ['2024-02-29', 2024, 1, 29],
    ['2025-01-02', 2025, 0, 2]
  ])('parses canonical UTC date %s', (value, year, month, day) => {
    const parsed = parseStrictUtcIsoDate(value, 'News entry test-entry.publishedAt');

    expect(parsed.getUTCFullYear()).toBe(year);
    expect(parsed.getUTCMonth()).toBe(month);
    expect(parsed.getUTCDate()).toBe(day);
    expect(parsed.toISOString()).toBe(`${value}T00:00:00.000Z`);
  });
});
