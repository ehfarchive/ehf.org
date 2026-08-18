import { expect, test } from 'vitest';
import { groupSnapshotBody, snapshotIntro, snapshotMonthLabel } from '../../src/lib/snapshot-body';

test('groups consecutive figures with the copy that follows them', () => {
  const html = groupSnapshotBody(`
    <h3>Fellows in action</h3>
    <p><img src="/assets/images/one.jpg" alt="First" /></p>
    <p><img src="/assets/images/two.jpg" alt="Second" /></p>
    <p>Story copy with <a href="https://example.org">a safe link</a>.</p>
    <p><img src="/assets/images/three.jpg" alt="Third" /></p>
    <p>Another story.</p>
  `);

  expect(html).toContain('<h3>Fellows in action</h3>');
  expect(html.split('class="snapshot-story__media"')).toHaveLength(3);
  expect(html).toMatch(/snapshot-story__media[\s\S]*one\.jpg[\s\S]*two\.jpg[\s\S]*snapshot-story__copy[\s\S]*Story copy/);
  expect(html).toMatch(/three\.jpg[\s\S]*snapshot-story__copy[\s\S]*Another story/);
});

test('uses dates and falls back to title or captured masthead metadata', () => {
  expect(snapshotMonthLabel('Impact Snapshot (June 2025)', '2025-06-01')).toBe('June 2025');
  expect(snapshotMonthLabel('Impact Snapshot (December and January 2024)')).toBe('December and January 2024');
  expect(snapshotMonthLabel('Impact Snapshot', undefined, '<h4>June 2025</h4><p>Intro</p>')).toBe('June 2025');
  expect(snapshotIntro('<h4>June 2025</h4><p>Source intro</p>')).toBe('Source intro');
});

test('removes a captured masthead when frontmatter renders the snapshot heading', () => {
  const html = groupSnapshotBody('<h4>June 2025</h4><p>Intro</p><h3>Fellows in action</h3>', {
    stripMasthead: true
  });

  expect(html).not.toContain('June 2025');
  expect(html).not.toContain('<p>Intro</p>');
  expect(html).toContain('<h3>Fellows in action</h3>');
});
