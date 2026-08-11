import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { expect, test } from 'vitest';
import sourceContract from '../../source-evidence/source-contract.json';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const captures = sourceContract.templates
  .filter((template) => template.family === 'event-programme' || template.family === 'annual-report-document')
  .flatMap((template) => template.captures.map((capture) => ({ family: template.family, route: template.representativePath, capture })));

function idFor(family: string, state: string, viewport: string): string {
  return `${family === 'event-programme' ? 'event-programme' : 'annual-report-document'}--${state}-${viewport}`;
}


function refreshManifest(output: string): void {
  const paths = [
    'contact-sheet.png',
    'health.json',
    'review-status.json',
    ...captures.flatMap(({ family, capture }) => {
      const id = idFor(family, capture.state, capture.viewport);
      return [`source/${id}.png`, `source/${id}.json`, `local/${id}.png`, `local/${id}.json`, `repeat/${id}.png`, `repeat/${id}.json`, `normalized/${id}-source.png`, `normalized/${id}-local.png`, `metrics/${id}.json`];
    })
  ].sort();
  const inventory = paths.map((path) => {
    const bytes = readFileSync(join(output, path));
    return { path, byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
  const serialization = inventory.map(({ sha256, path }) => `${sha256}  ${path}`).join('\n') + '\n';
  writeFileSync(join(output, 'bundle-manifest.json'), `${JSON.stringify({ commit, inventory, serialization, contentTreeSha256: createHash('sha256').update(serialization).digest('hex'), entryCount: inventory.length + 1 }, null, 2)}\n`);
}
async function writeRawFixture(root: string): Promise<void> {
  mkdirSync(join(root, 'local'), { recursive: true });
  mkdirSync(join(root, 'repeat'), { recursive: true });
  for (const { family, route, capture } of captures) {
    const id = idFor(family, capture.state, capture.viewport);
    const png = execFileSync('git', ['show', `${commit}:${capture.screenshot}`]);
    const decoded = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const sidecar = {
      schemaVersion: 1,
      commit,
      id,
      route,
      state: capture.state,
      viewport: capture.viewport === 'desktop' ? { width: 1440, height: 1000 } : { width: 390, height: 844 },
      screenshot: {
        byteSha256: createHash('sha256').update(png).digest('hex'),
        decodedSha256: createHash('sha256').update(decoded.data).digest('hex'),
        widthPx: decoded.info.width,
        heightPx: decoded.info.height,
        format: 'png',
        channels: decoded.info.channels,
        captureMetadata: { fullPage: capture.fullPage, animations: 'disabled', type: 'png', scale: 'css', reducedMotion: true }
      },
      browserHealth: { consoleErrors: [], failedRequests: [], unloadedImages: [], sourceHosts: [], iframes: [], localImages: ['/assets/fixture.webp'] },
      scroll: { positions: [0], returnedToTop: true },
      navigation: { requestedMobilePanelActive: capture.state !== 'default' && capture.viewport === 'mobile', mobileRootShifted: capture.state !== 'default' && capture.viewport === 'mobile' }
    };
    for (const member of ['local', 'repeat']) {
      writeFileSync(join(root, member, `${id}.png`), png);
      writeFileSync(join(root, member, `${id}.json`), `${JSON.stringify(sidecar, null, 2)}\n`);
    }
  }
}

test('Ticket 8 assembler builds an inventory from exact raw pairs and HEAD source blobs', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-assembler-'));
  const rawRoot = resolve(parent, 'raw');
  const output = resolve(parent, 'bundle');
  try {
    await writeRawFixture(rawRoot);
    const result = spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    const manifest = JSON.parse(readFileSync(join(output, 'bundle-manifest.json'), 'utf8'));
    expect(manifest.entryCount).toBe(manifest.inventory.length + 1);
    expect(manifest.inventory).toHaveLength(75);
    expect(readdirSync(join(output, 'source'))).toHaveLength(16);
    expect(readdirSync(join(output, 'local'))).toHaveLength(16);
    expect(readdirSync(join(output, 'repeat'))).toHaveLength(16);
    expect(readdirSync(join(output, 'normalized'))).toHaveLength(16);
    expect(readdirSync(join(output, 'metrics'))).toHaveLength(8);
    expect(readFileSync(join(output, 'source', 'event-programme--default-desktop.png')).length).toBeGreaterThan(0);
    const verify = spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--verify', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' });
    expect(verify.status, verify.stderr).toBe(0);
    expect(readFileSync(join(output, 'local', 'annual-report-document--nav-about-open-mobile.json'), 'utf8')).toContain(commit);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 assembler rejects stale or extra raw input before creating output', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-assembler-'));
  const rawRoot = resolve(parent, 'raw');
  const output = resolve(parent, 'bundle');
  try {
    await writeRawFixture(rawRoot);
    writeFileSync(join(rawRoot, 'local', 'unexpected.txt'), 'stale input\n');
    const result = spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(() => readFileSync(output)).toThrow();
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 assembler verify mode rejects a tampered normalized file without changing output', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-assembler-'));
  const rawRoot = resolve(parent, 'raw');
  const output = resolve(parent, 'bundle');
  try {
    await writeRawFixture(rawRoot);
    expect(spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' }).status).toBe(0);
    const normalized = join(output, 'normalized', 'event-programme--default-desktop-source.png');
    writeFileSync(normalized, 'forged');
    const before = readFileSync(normalized);
    const verify = spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--verify', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' });
    expect(verify.status).not.toBe(0);
    expect(readFileSync(normalized)).toEqual(before);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 assembler verify mode rejects a recomputed-manifest semantic image tamper', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-assembler-'));
  const rawRoot = resolve(parent, 'raw');
  const output = resolve(parent, 'bundle');
  try {
    await writeRawFixture(rawRoot);
    expect(spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' }).status).toBe(0);
    writeFileSync(join(output, 'normalized', 'event-programme--default-desktop-source.png'), await sharp({ create: { width: 1, height: 1, channels: 4, background: '#000000' } }).png().toBuffer());
    refreshManifest(output);
    expect(spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--verify', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' }).status).not.toBe(0);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 assembler verify mode rejects recomputed semantic and missing output tampering', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-assembler-'));
  const rawRoot = resolve(parent, 'raw');
  const output = resolve(parent, 'bundle');
  try {
    await writeRawFixture(rawRoot);
    const cases: ReadonlyArray<{ path: string; bytes?: Buffer }> = [
      { path: 'metrics/event-programme--default-desktop.json', bytes: Buffer.from('{}\n') },
      { path: 'health.json', bytes: Buffer.from('{}\n') },
      { path: 'contact-sheet.png', bytes: await sharp({ create: { width: 1, height: 1, channels: 4, background: '#000000' } }).png().toBuffer() },
      { path: 'normalized/event-programme--default-desktop-local.png' }
    ];
    for (const item of cases) {
      expect(spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' }).status).toBe(0);
      const target = join(output, item.path);
      if (item.bytes) {
        writeFileSync(target, item.bytes);
        refreshManifest(output);
      } else {
        rmSync(target);
      }
      expect(spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--verify', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' }).status).not.toBe(0);
      rmSync(output, { recursive: true, force: true });
    }
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 assembler verify mode rejects a symlink output root without mutation', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-assembler-'));
  const rawRoot = resolve(parent, 'raw');
  const output = resolve(parent, 'bundle');
  const link = resolve(parent, 'bundle-link');
  try {
    await writeRawFixture(rawRoot);
    expect(spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--raw-root', rawRoot, '--output', output], { encoding: 'utf8' }).status).toBe(0);
    symlinkSync(output, link);
    expect(spawnSync('node', ['scripts/assemble-ticket8-bundle.mjs', '--verify', '--raw-root', rawRoot, '--output', link], { encoding: 'utf8' }).status).not.toBe(0);
    expect(readFileSync(join(output, 'bundle-manifest.json'), 'utf8')).toContain(commit);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
