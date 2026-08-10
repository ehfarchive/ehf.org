import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';
import { materializeContent, migrateContent, publishManagedOutputs } from '../../scripts/migrate-content.mjs';

test('removes stale managed typed inputs before validating the manifest', () => {
  const stale = 'src/content/pages/institutional/stale-materialization-test.json';
  writeFileSync(stale, '{}\n');
  try {
    expect(() => migrateContent()).not.toThrow();
    expect(existsSync(stale)).toBe(false);
  } finally {
    if (existsSync(stale)) rmSync(stale);
  }
});

test('rematerialization keeps a current reference canonical and removes a lexically-first stale duplicate', () => {
  const current = 'src/content/impact/a-new-governance-landscape-on-the-moon.md';
  const referencedAsset = 'public/assets/images/content/read-a-new-governance-landscape-on-the-moon-1.webp';
  const stale = 'public/assets/images/content/000-stale-materialization-test.webp';
  const before = readFileSync(current, 'utf8');
  writeFileSync(stale, readFileSync(referencedAsset));
  try {
    expect(() => migrateContent()).not.toThrow();
    expect(readFileSync(current, 'utf8')).toBe(before);
    expect(existsSync(stale)).toBe(false);
  } finally {
    writeFileSync(current, before);
    if (existsSync(stale)) rmSync(stale);
  }
});

test('preserves manifest-backed archive cards while rematerializing typed content', () => {
  const manifestPath = 'source-evidence/asset-manifest.json';
  const before = readFileSync(manifestPath, 'utf8');
  try {
    expect(() => migrateContent()).not.toThrow();
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.assets).toContainEqual(expect.objectContaining({
      id: 'asset-images-cards-chemergy-webp',
      localPath: '/assets/images/cards/chemergy.webp'
    }));
  } finally {
    writeFileSync(manifestPath, before);
  }
});

test('keeps live outputs unchanged when a source fetch fails before publication', async () => {
  const target = 'src/content/pages/institutional/about-ehf.json';
  const before = readFileSync(target);
  const fetcher = vi.fn(async () => new Response('', { status: 500 }));

  await expect(materializeContent('https://www.ehf.org', fetcher)).rejects.toThrow('source fetch failed (500)');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(readFileSync(target)).toEqual(before);
  expect(readdirSync('.').filter((entry) => entry.startsWith('.content-materialize-'))).toEqual([]);
});

test('restores every prior managed output when transactional publication fails', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ehf-materialize-'));
  const staged = join(workspace, 'staged');
  const output = join(workspace, 'output');
  for (const root of [staged, output]) {
    mkdirSync(join(root, 'first'), { recursive: true });
    mkdirSync(join(root, 'second'), { recursive: true });
  }
  writeFileSync(join(staged, 'first', 'value.txt'), 'new first');
  writeFileSync(join(staged, 'second', 'value.txt'), 'new second');
  writeFileSync(join(output, 'first', 'value.txt'), 'old first');
  writeFileSync(join(output, 'second', 'value.txt'), 'old second');
  let calls = 0;
  try {
    expect(() => publishManagedOutputs(staged, output, ['first', 'second'], (from: string, to: string) => {
      calls += 1;
      if (calls === 4) throw new Error('injected publication failure');
      return renameSync(from, to);
    })).toThrow('injected publication failure');
    expect(readFileSync(join(output, 'first', 'value.txt'), 'utf8')).toBe('old first');
    expect(readFileSync(join(output, 'second', 'value.txt'), 'utf8')).toBe('old second');
    expect(readdirSync(workspace).filter((entry) => entry.startsWith('.content-materialize-backup-'))).toEqual([]);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
