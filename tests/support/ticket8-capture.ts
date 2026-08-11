import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import sharp from 'sharp';
import type { ComparableCapture, ComparableState } from '../e2e/visual.spec';

export type Ticket8CaptureId =
  | 'event-programme--default-desktop'
  | 'event-programme--default-mobile'
  | 'event-programme--nav-impact-open-desktop'
  | 'event-programme--nav-impact-open-mobile'
  | 'annual-report-document--default-desktop'
  | 'annual-report-document--default-mobile'
  | 'annual-report-document--nav-about-open-desktop'
  | 'annual-report-document--nav-about-open-mobile';

export interface Ticket8CaptureWriter {
  writePair(id: Ticket8CaptureId, route: string, state: ComparableState, viewport: { width: number; height: number }, local: ComparableCapture, repeat: ComparableCapture): Promise<void>;
  finalize(): void;
  abort(): void;
}

type ExpectedCapture = { route: string; state: ComparableState; viewport: { width: number; height: number } };

const PIXEL_LIMIT = 120_000_000;
const expectedCaptures: Record<Ticket8CaptureId, ExpectedCapture> = {
  'event-programme--default-desktop': { route: '/2025-summit-programme', state: 'default', viewport: { width: 1440, height: 1000 } },
  'event-programme--default-mobile': { route: '/2025-summit-programme', state: 'default', viewport: { width: 390, height: 844 } },
  'event-programme--nav-impact-open-desktop': { route: '/2025-summit-programme', state: 'nav-impact-open', viewport: { width: 1440, height: 1000 } },
  'event-programme--nav-impact-open-mobile': { route: '/2025-summit-programme', state: 'nav-impact-open', viewport: { width: 390, height: 844 } },
  'annual-report-document--default-desktop': { route: '/23-annual-report', state: 'default', viewport: { width: 1440, height: 1000 } },
  'annual-report-document--default-mobile': { route: '/23-annual-report', state: 'default', viewport: { width: 390, height: 844 } },
  'annual-report-document--nav-about-open-desktop': { route: '/23-annual-report', state: 'nav-about-open', viewport: { width: 1440, height: 1000 } },
  'annual-report-document--nav-about-open-mobile': { route: '/23-annual-report', state: 'nav-about-open', viewport: { width: 390, height: 844 } }
};
const reservedRoots = new Set<string>();

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function sidecar(commit: string, origin: string, id: Ticket8CaptureId, route: string, state: ComparableState, viewport: { width: number; height: number }, capture: ComparableCapture) {
  const screenshot = capture.screenshotEvidence;
  if (!Buffer.isBuffer(screenshot.bytes) || screenshot.bytes.length === 0) throw new Error(`${id}: screenshot bytes must be a non-empty Buffer`);
  const image = sharp(screenshot.bytes, { limitInputPixels: PIXEL_LIMIT });
  const [metadata, decoded] = await Promise.all([image.metadata(), image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })]);
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > PIXEL_LIMIT || metadata.format !== 'png') throw new Error(`${id}: screenshot PNG exceeds capture limits`);
  if (sha256(screenshot.bytes) !== screenshot.byteSha256) throw new Error(`${id}: screenshot SHA-256 mismatch`);
  if (!Buffer.isBuffer(screenshot.pixels) || !screenshot.pixels.equals(decoded.data) || sha256(decoded.data) !== screenshot.decodedSha256) throw new Error(`${id}: decoded screenshot SHA-256 mismatch`);
  if (screenshot.widthPx !== decoded.info.width || screenshot.heightPx !== decoded.info.height || screenshot.format !== metadata.format || screenshot.channels !== decoded.info.channels) throw new Error(`${id}: screenshot dimensions or format mismatch`);
  if (screenshot.captureMetadata.fullPage !== (state === 'default') || screenshot.captureMetadata.animations !== 'disabled' || screenshot.captureMetadata.type !== 'png' || screenshot.captureMetadata.scale !== 'css' || screenshot.captureMetadata.reducedMotion !== true) throw new Error(`${id}: screenshot capture metadata mismatch`);
  if (capture.consoleErrors.length || capture.failedRequests.length || capture.unloadedImages.length || capture.sourceHosts.length || capture.iframes.length) throw new Error(`${id}: capture is not healthy`);
  const localImages = capture.localImages.map((imageUrl) => {
    const url = new URL(imageUrl, origin);
    if (url.origin !== origin) throw new Error(`${id}: capture image origin is not local`);
    if (!url.pathname.startsWith('/assets/')) throw new Error(`${id}: capture contains a non-local image`);
    return url.pathname;
  });
  if (!capture.returnedToTop || capture.scrollPositions.length === 0 || capture.scrollPositions[0] !== 0 || capture.scrollPositions.some((position, index) => !Number.isInteger(position) || position < 0 || (index > 0 && position <= capture.scrollPositions[index - 1]))) throw new Error(`${id}: capture scroll provenance is incomplete`);
  const expectsMobilePanel = state !== 'default' && viewport.width < 768;
  if (capture.requestedMobilePanelActive !== expectsMobilePanel || capture.mobileRootShifted !== expectsMobilePanel) throw new Error(`${id}: capture navigation provenance does not match its state`);
  return {
    schemaVersion: 1,
    commit,
    id,
    route,
    state,
    viewport,
    screenshot: { byteSha256: screenshot.byteSha256, decodedSha256: screenshot.decodedSha256, widthPx: screenshot.widthPx, heightPx: screenshot.heightPx, format: screenshot.format, channels: screenshot.channels, captureMetadata: screenshot.captureMetadata },
    browserHealth: { consoleErrors: capture.consoleErrors, failedRequests: capture.failedRequests, unloadedImages: capture.unloadedImages, sourceHosts: capture.sourceHosts, iframes: capture.iframes, localImages },
    scroll: { positions: capture.scrollPositions, returnedToTop: capture.returnedToTop },
    navigation: { requestedMobilePanelActive: capture.requestedMobilePanelActive, mobileRootShifted: capture.mobileRootShifted }
  };
}

export function createTicket8CaptureWriter(root: string, commit: string, origin: string): Ticket8CaptureWriter {
  if (!isAbsolute(root)) throw new Error('Ticket 8 capture root must be absolute');
  if (existsSync(root) || reservedRoots.has(root)) throw new Error('Ticket 8 capture root must not already exist');
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Ticket 8 capture commit must be a full SHA');
  if (new URL(origin).origin !== origin) throw new Error('Ticket 8 capture origin must be an absolute origin');
  const stagingRoot = mkdtempSync(join(dirname(root), `.${basename(root)}-`));
  mkdirSync(join(stagingRoot, 'local'));
  mkdirSync(join(stagingRoot, 'repeat'));
  reservedRoots.add(root);
  const written = new Set<Ticket8CaptureId>();
  const pending = new Set<Ticket8CaptureId>();
  let closed = false;
  return {
    async writePair(id, route, state, viewport, local, repeat) {
      if (closed) throw new Error('Ticket 8 capture writer is closed');
      if (written.has(id) || pending.has(id)) throw new Error(`${id}: duplicate capture id`);
      const expected = expectedCaptures[id];
      if (!expected || expected.route !== route || expected.state !== state || !sameJson(expected.viewport, viewport)) throw new Error(`${id}: route, state, or viewport does not match the Ticket 8 matrix`);
      if (local.state !== state || repeat.state !== state || !sameJson(local.viewport, viewport) || !sameJson(repeat.viewport, viewport)) throw new Error(`${id}: returned capture does not match requested state`);
      pending.add(id);
      try {
        const [localSidecar, repeatSidecar] = await Promise.all([sidecar(commit, origin, id, route, state, viewport, local), sidecar(commit, origin, id, route, state, viewport, repeat)]);
        if (!local.screenshotEvidence.bytes.equals(repeat.screenshotEvidence.bytes) || !sameJson(localSidecar, repeatSidecar)) throw new Error(`${id}: local and repeat captures are not byte-identical`);
        const json = `${JSON.stringify(localSidecar, null, 2)}\n`;
        for (const member of ['local', 'repeat'] as const) {
          writeFileSync(join(stagingRoot, member, `${id}.png`), local.screenshotEvidence.bytes);
          writeFileSync(join(stagingRoot, member, `${id}.json`), json);
        }
        written.add(id);
      } finally {
        pending.delete(id);
      }
    },
    finalize() {
      if (closed) throw new Error('Ticket 8 capture writer is closed');
      if (written.size !== Object.keys(expectedCaptures).length) throw new Error(`Ticket 8 capture writer requires exactly ${Object.keys(expectedCaptures).length} captures`);
      renameSync(stagingRoot, root);
      reservedRoots.delete(root);
      closed = true;
    },
    abort() {
      if (!closed) rmSync(stagingRoot, { recursive: true, force: true });
      reservedRoots.delete(root);
      closed = true;
    }
  };
}
