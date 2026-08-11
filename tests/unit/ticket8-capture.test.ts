import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';
import sharp from 'sharp';
import { createTicket8CaptureWriter } from '../support/ticket8-capture';
import type { ComparableCapture } from '../e2e/visual.spec';

const PNG = await sharp({ create: { width: 1, height: 1, channels: 4, background: '#000000' } }).png().toBuffer();
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const ID = 'event-programme--default-desktop' as const;
const VIEWPORT = { width: 1440, height: 1000 };

async function capture(): Promise<ComparableCapture> {
  const decoded = await sharp(PNG).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    state: 'default',
    viewport: VIEWPORT,
    consoleErrors: [],
    failedRequests: [],
    localImages: ['/assets/example.webp'],
    unloadedImages: [],
    iframes: [],
    sourceHosts: [],
    scrollPositions: [0, 600],
    returnedToTop: true,
    requestedMobilePanelActive: false,
    mobileRootShifted: false,
    screenshotEvidence: {
      bytes: PNG,
      pixels: decoded.data,
      byteSha256: createHash('sha256').update(PNG).digest('hex'),
      decodedSha256: createHash('sha256').update(decoded.data).digest('hex'),
      format: 'png',
      widthPx: decoded.info.width,
      heightPx: decoded.info.height,
      channels: decoded.info.channels,
      captureMetadata: { fullPage: true, animations: 'disabled', type: 'png', scale: 'css', reducedMotion: true }
    }
  };
}

test('Ticket 8 writer creates only local and repeat and persists identical deterministic pairs', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-capture-'));
  const root = resolve(parent, 'raw');
  try {
    const writer = createTicket8CaptureWriter(root, COMMIT, 'http://127.0.0.1:4321');
    const local = await capture();
    const repeat = await capture();
    local.localImages = ['http://127.0.0.1:4321/assets/example.webp'];
    repeat.localImages = ['http://127.0.0.1:4321/assets/example.webp'];
    await writer.writePair(ID, '/2025-summit-programme', 'default', VIEWPORT, local, repeat);

    expect(existsSync(root)).toBe(false);
    expect(() => writer.finalize()).toThrow(/exactly 8/i);
    writer.abort();
    expect(existsSync(root)).toBe(false);
    expect(readdirSync(parent)).toEqual([]);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 writer rejects concurrent duplicate IDs and remains abortable', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-capture-'));
  const root = resolve(parent, 'raw');
  const writer = createTicket8CaptureWriter(root, COMMIT, 'http://127.0.0.1:4321');
  try {
    const local = await capture();
    const repeat = await capture();
    const results = await Promise.allSettled([
      writer.writePair(ID, '/2025-summit-programme', 'default', VIEWPORT, local, repeat),
      writer.writePair(ID, '/2025-summit-programme', 'default', VIEWPORT, local, repeat)
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  } finally {
    writer.abort();
    expect(existsSync(root)).toBe(false);
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 writer rejects an existing or relative root and unhealthy captures', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-capture-'));
  try {
    expect(() => createTicket8CaptureWriter('relative-root', COMMIT, 'http://127.0.0.1:4321')).toThrow(/absolute/i);
    const root = resolve(parent, 'existing');
    const existing = createTicket8CaptureWriter(root, COMMIT, 'http://127.0.0.1:4321');
    expect(() => createTicket8CaptureWriter(root, COMMIT, 'http://127.0.0.1:4321')).toThrow(/exist/i);
    existing.abort();
    const invalidRoot = resolve(parent, 'invalid');
    const writer = createTicket8CaptureWriter(invalidRoot, COMMIT, 'http://127.0.0.1:4321');
    const unhealthy = await capture();
    unhealthy.failedRequests = ['500 https://example.test'];
    await expect(writer.writePair(ID, '/2025-summit-programme', 'default', VIEWPORT, unhealthy, unhealthy)).rejects.toThrow(/healthy/i);
    writer.abort();
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 writer rejects forged decoded evidence and incomplete scroll provenance', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-capture-'));
  try {
    const forgedWriter = createTicket8CaptureWriter(resolve(parent, 'forged'), COMMIT, 'http://127.0.0.1:4321');
    const forged = await capture();
    forged.screenshotEvidence.decodedSha256 = 'forged';
    await expect(forgedWriter.writePair(ID, '/2025-summit-programme', 'default', VIEWPORT, forged, forged)).rejects.toThrow(/decoded/i);
    forgedWriter.abort();

    const scrollWriter = createTicket8CaptureWriter(resolve(parent, 'scroll'), COMMIT, 'http://127.0.0.1:4321');
    const incomplete = await capture();
    incomplete.scrollPositions = [];
    await expect(scrollWriter.writePair(ID, '/2025-summit-programme', 'default', VIEWPORT, incomplete, incomplete)).rejects.toThrow(/scroll/i);
    scrollWriter.abort();
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('Ticket 8 writer rejects a remote image disguised as a local asset path', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'ticket8-capture-'));
  try {
    const writer = createTicket8CaptureWriter(resolve(parent, 'remote'), COMMIT, 'http://127.0.0.1:4321');
    const remote = await capture();
    remote.localImages = ['https://untrusted.example/assets/example.webp'];
    await expect(writer.writePair(ID, '/2025-summit-programme', 'default', VIEWPORT, remote, remote)).rejects.toThrow(/origin/i);
    writer.abort();
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
