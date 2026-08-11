import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import sharp from 'sharp';

const VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  mobile: { width: 390, height: 844 }
};

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function fail(message) {
  throw new Error(`Ticket 8 bundle: ${message}`);
}

function gitShow(commit, path) {
  try {
    return execFileSync('git', ['show', `${commit}:${path}`]);
  } catch {
    fail(`cannot read committed source ${path}`);
  }
}

function argumentsForRun(argv) {
  const args = argv.slice(2);
  const verify = args[0] === '--verify';
  const positional = verify ? args.slice(1) : args;
  if (positional.length !== 4 || positional[0] !== '--raw-root' || positional[2] !== '--output') fail('usage is --raw-root ABS --output ABS, optionally prefixed by --verify');
  return { verify, rawRoot: positional[1], output: positional[3] };
}

function captureId(family, state, viewport) {
  return `${family === 'event-programme' ? 'event-programme' : 'annual-report-document'}--${state}-${viewport}`;
}

function loadCaptureMap(commit) {
  const contract = JSON.parse(gitShow(commit, 'source-evidence/source-contract.json').toString('utf8'));
  const templates = contract.templates.filter((template) => template.family === 'event-programme' || template.family === 'annual-report-document');
  if (templates.length !== 2) fail('committed source contract does not contain both Ticket 8 templates');
  const captures = templates.flatMap((template) => template.captures.map((capture) => ({
    id: captureId(template.family, capture.state, capture.viewport),
    route: template.representativePath,
    state: capture.state,
    viewport: VIEWPORTS[capture.viewport],
    sourcePng: capture.screenshot,
    sourceJson: capture.metadata
  })));
  if (captures.length !== 8 || new Set(captures.map((capture) => capture.id)).size !== 8) fail('committed source contract does not define exactly eight Ticket 8 captures');
  return captures.sort((left, right) => Buffer.compare(Buffer.from(left.id), Buffer.from(right.id)));
}

function assertRegular(path, label) {
  if (!existsSync(path)) fail(`${label} is missing`);
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular non-symlink file`);
}

function expectedRawPaths(captures) {
  return new Set(captures.flatMap((capture) => ['local', 'repeat'].flatMap((member) => [
    `${member}/${capture.id}.png`,
    `${member}/${capture.id}.json`
  ])));
}

function rawTreePaths(root) {
  const output = [];
  for (const member of readdirSync(root)) {
    const memberPath = join(root, member);
    const stat = lstatSync(memberPath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`raw root member ${member} must be a non-symlink directory`);
    for (const name of readdirSync(memberPath)) {
      const path = join(memberPath, name);
      assertRegular(path, `raw input ${member}/${name}`);
      output.push(`${member}/${name}`);
    }
  }
  return output.sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

function validateHealth(sidecar, capture) {
  const health = sidecar.browserHealth;
  if (JSON.stringify(Object.keys(health ?? {})) !== JSON.stringify(['consoleErrors', 'failedRequests', 'unloadedImages', 'sourceHosts', 'iframes', 'localImages'])) fail(`${capture.id}: invalid browser health fields`);
  if (!Object.values(health).every(Array.isArray)) fail(`${capture.id}: invalid browser health`);
  if (health.consoleErrors.length || health.failedRequests.length || health.unloadedImages.length || health.sourceHosts.length || health.iframes.length) fail(`${capture.id}: unhealthy capture`);
  if (health.localImages.some((path) => typeof path !== 'string' || !path.startsWith('/assets/'))) fail(`${capture.id}: non-local image`);
  if (JSON.stringify(Object.keys(sidecar.scroll ?? {})) !== JSON.stringify(['positions', 'returnedToTop']) || !Array.isArray(sidecar.scroll.positions) || sidecar.scroll.positions.length === 0 || sidecar.scroll.positions[0] !== 0 || sidecar.scroll.positions.some((position, index) => !Number.isInteger(position) || position < 0 || (index > 0 && position <= sidecar.scroll.positions[index - 1])) || sidecar.scroll.returnedToTop !== true) fail(`${capture.id}: invalid scroll provenance`);
  const expectsMobilePanel = capture.state !== 'default' && capture.viewport.width < 768;
  if (JSON.stringify(Object.keys(sidecar.navigation ?? {})) !== JSON.stringify(['requestedMobilePanelActive', 'mobileRootShifted']) || sidecar.navigation.requestedMobilePanelActive !== expectsMobilePanel || sidecar.navigation.mobileRootShifted !== expectsMobilePanel) fail(`${capture.id}: invalid navigation state`);
}

async function validateMember(root, member, capture, commit) {
  const pngPath = join(root, member, `${capture.id}.png`);
  const jsonPath = join(root, member, `${capture.id}.json`);
  const png = readFileSync(pngPath);
  const jsonBytes = readFileSync(jsonPath);
  let sidecar;
  try {
    sidecar = JSON.parse(jsonBytes.toString('utf8'));
  } catch {
    fail(`${capture.id}: invalid ${member} JSON`);
  }
  if (!jsonBytes.equals(Buffer.from(`${JSON.stringify(sidecar, null, 2)}\n`))) fail(`${capture.id}: ${member} sidecar is not deterministic`);
  if (JSON.stringify(Object.keys(sidecar)) !== JSON.stringify(['schemaVersion', 'commit', 'id', 'route', 'state', 'viewport', 'screenshot', 'browserHealth', 'scroll', 'navigation'])) fail(`${capture.id}: ${member} sidecar contains unexpected fields`);
  if (sidecar.schemaVersion !== 1 || sidecar.commit !== commit || sidecar.id !== capture.id || sidecar.route !== capture.route || sidecar.state !== capture.state || JSON.stringify(sidecar.viewport) !== JSON.stringify(capture.viewport)) fail(`${capture.id}: ${member} sidecar does not bind the committed capture map`);
  if (JSON.stringify(Object.keys(sidecar.screenshot ?? {})) !== JSON.stringify(['byteSha256', 'decodedSha256', 'widthPx', 'heightPx', 'format', 'channels', 'captureMetadata'])) fail(`${capture.id}: ${member} screenshot fields are incomplete`);
  const decoded = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const metadata = await sharp(png).metadata();
  if (sidecar.screenshot.byteSha256 !== sha256(png) || sidecar.screenshot.decodedSha256 !== sha256(decoded.data) || sidecar.screenshot.widthPx !== decoded.info.width || sidecar.screenshot.heightPx !== decoded.info.height || sidecar.screenshot.format !== metadata.format || sidecar.screenshot.channels !== decoded.info.channels || JSON.stringify(sidecar.screenshot.captureMetadata) !== JSON.stringify({ fullPage: capture.state === 'default', animations: 'disabled', type: 'png', scale: 'css', reducedMotion: true })) fail(`${capture.id}: ${member} screenshot integrity mismatch`);
  validateHealth(sidecar, capture);
  return { png, jsonBytes, sidecar };
}

async function validateRaw(root, captures, commit) {
  if (!isAbsolute(root) || !existsSync(root)) fail('raw root must be an existing absolute path');
  const rootStat = lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) fail('raw root must be a non-symlink directory');
  const actual = rawTreePaths(root);
  const expected = [...expectedRawPaths(captures)].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  if (actual.length !== 32 || JSON.stringify(actual) !== JSON.stringify(expected)) fail('raw input must contain exactly 32 expected regular files');
  return Promise.all(captures.map(async (capture) => {
    const local = await validateMember(root, 'local', capture, commit);
    const repeat = await validateMember(root, 'repeat', capture, commit);
    if (!local.png.equals(repeat.png) || !local.jsonBytes.equals(repeat.jsonBytes)) fail(`${capture.id}: local and repeat raw pairs differ`);
    return { ...capture, local, repeat };
  }));
}

function writeOutput(path, bytes) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, bytes);
}

function allOutputFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) fail(`output contains symlink ${relative(root, path)}`);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) files.push(relative(root, path));
      else fail(`output contains non-file ${relative(root, path)}`);
    }
  };
  visit(root);
  return files.sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}

async function build(raw, output, commit) {
  mkdirSync(output);
  const health = [];
  try {
    const cards = [];
    for (const item of raw) {
      const sourcePng = gitShow(commit, item.sourcePng);
      const sourceJson = gitShow(commit, item.sourceJson);
      writeOutput(join(output, 'source', `${item.id}.png`), sourcePng);
      writeOutput(join(output, 'source', `${item.id}.json`), sourceJson);
      writeOutput(join(output, 'local', `${item.id}.png`), item.local.png);
      writeOutput(join(output, 'local', `${item.id}.json`), item.local.jsonBytes);
      writeOutput(join(output, 'repeat', `${item.id}.png`), item.repeat.png);
      writeOutput(join(output, 'repeat', `${item.id}.json`), item.repeat.jsonBytes);
      const [sourceMeta, localMeta] = await Promise.all([sharp(sourcePng).metadata(), sharp(item.local.png).metadata()]);
      if (!sourceMeta.width || !sourceMeta.height || !localMeta.width || !localMeta.height) fail(`${item.id}: unable to decode PNG dimensions`);
      const canvas = { width: Math.max(sourceMeta.width, localMeta.width), height: Math.max(sourceMeta.height, localMeta.height) };
      const [normalizedSource, normalizedLocal] = await Promise.all([
        sharp(sourcePng).resize(canvas.width, canvas.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
        sharp(item.local.png).resize(canvas.width, canvas.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
      ]);
      writeOutput(join(output, 'normalized', `${item.id}-source.png`), normalizedSource);
      writeOutput(join(output, 'normalized', `${item.id}-local.png`), normalizedLocal);
      writeOutput(join(output, 'metrics', `${item.id}.json`), `${JSON.stringify({
        id: item.id,
        source: { byteSha256: sha256(sourcePng), decodedSha256: sha256(await sharp(sourcePng).ensureAlpha().raw().toBuffer()), widthPx: sourceMeta.width, heightPx: sourceMeta.height },
        local: { byteSha256: sha256(item.local.png), decodedSha256: item.local.sidecar.screenshot.decodedSha256, widthPx: localMeta.width, heightPx: localMeta.height },
        normalizationCanvas: canvas
      }, null, 2)}\n`);
      health.push({ id: item.id, ...item.local.sidecar.browserHealth, scroll: item.local.sidecar.scroll, navigation: item.local.sidecar.navigation });
      cards.push(await sharp(normalizedSource).resize(320, 400, { fit: 'contain', background: '#ffffff' }).png().toBuffer(), await sharp(normalizedLocal).resize(320, 400, { fit: 'contain', background: '#ffffff' }).png().toBuffer());
    }
    const contact = await sharp({ create: { width: 640, height: 3200, channels: 4, background: '#ffffff' } })
      .composite(cards.map((input, index) => ({ input, left: (index % 2) * 320, top: Math.floor(index / 2) * 400 }))).png().toBuffer();
    writeOutput(join(output, 'contact-sheet.png'), contact);
    writeOutput(join(output, 'health.json'), `${JSON.stringify({ healthy: true, captures: health, sourceHostReferences: [] }, null, 2)}\n`);
    writeOutput(join(output, 'review-status.json'), `${JSON.stringify({
      status: 'pending-replacement-opus',
      diagnostic: { agent: 'agent://VisualDesignerTicket8RemediationFinal', disposition: 'diagnostic-stale-local-repeat-bytes' },
      retained: ['Annual Report parity', 'VD8-001', 'VD8-005', 'VD8-012'],
      sanctionedNavigation: ['Impact Snapshots', 'EHF Fellows Articles', '/fellow-directory', '/fellow-directory-advanced-search', '/alumni-directory', '/alumni-directory-advanced-search']
    }, null, 2)}\n`);
    const paths = allOutputFiles(output);
    const inventory = paths.map((path) => {
      const bytes = readFileSync(join(output, path));
      return { path, byteLength: bytes.length, sha256: sha256(bytes) };
    });
    const serialization = inventory.map(({ sha256: hash, path }) => `${hash}  ${path}`).join('\n') + '\n';
    writeOutput(join(output, 'bundle-manifest.json'), `${JSON.stringify({ commit, inventory, serialization, contentTreeSha256: sha256(Buffer.from(serialization)), entryCount: inventory.length + 1 }, null, 2)}\n`);
  } catch (error) {
    rmSync(output, { recursive: true, force: true });
    throw error;
  }
}

async function verifyOutput(raw, output, commit) {
  if (!isAbsolute(output) || !existsSync(output)) fail('verify output must be an existing absolute path');
  const outputStat = lstatSync(output);
  if (outputStat.isSymbolicLink() || !outputStat.isDirectory()) fail('verify output must be a non-symlink directory');
  const manifestPath = join(output, 'bundle-manifest.json');
  assertRegular(manifestPath, 'bundle manifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const expected = new Set([
    'contact-sheet.png',
    'health.json',
    'review-status.json',
    'bundle-manifest.json',
    ...raw.flatMap((item) => [
      `source/${item.id}.png`, `source/${item.id}.json`, `local/${item.id}.png`, `local/${item.id}.json`,
      `repeat/${item.id}.png`, `repeat/${item.id}.json`, `normalized/${item.id}-source.png`, `normalized/${item.id}-local.png`, `metrics/${item.id}.json`
    ])
  ]);
  const outputPaths = allOutputFiles(output);
  if (outputPaths.length !== 76 || JSON.stringify(outputPaths) !== JSON.stringify([...expected].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))))) fail('output map is incomplete or contains unexpected files');
  if (manifest.commit !== commit || !Array.isArray(manifest.inventory) || manifest.entryCount !== manifest.inventory.length + 1) fail('bundle manifest commit or entry count mismatch');
  const paths = outputPaths.filter((path) => path !== 'bundle-manifest.json');
  if (JSON.stringify(paths) !== JSON.stringify(manifest.inventory.map((entry) => entry.path))) fail('bundle manifest inventory paths mismatch');
  for (const entry of manifest.inventory) {
    const bytes = readFileSync(join(output, entry.path));
    if (bytes.length !== entry.byteLength || sha256(bytes) !== entry.sha256) fail(`bundle manifest hash mismatch for ${entry.path}`);
  }
  const serialization = manifest.inventory.map(({ sha256: hash, path }) => `${hash}  ${path}`).join('\n') + '\n';
  if (manifest.serialization !== serialization || manifest.contentTreeSha256 !== sha256(Buffer.from(serialization))) fail('bundle manifest digest mismatch');
  const health = JSON.parse(readFileSync(join(output, 'health.json'), 'utf8'));
  if (health.healthy !== true || !Array.isArray(health.captures) || health.captures.length !== 8 || JSON.stringify(health.sourceHostReferences) !== '[]') fail('health output is invalid');
  const review = JSON.parse(readFileSync(join(output, 'review-status.json'), 'utf8'));
  if (review.status !== 'pending-replacement-opus' || review.diagnostic?.agent !== 'agent://VisualDesignerTicket8RemediationFinal' || review.diagnostic?.disposition !== 'diagnostic-stale-local-repeat-bytes' || JSON.stringify(review.retained) !== JSON.stringify(['Annual Report parity', 'VD8-001', 'VD8-005', 'VD8-012']) || JSON.stringify(review.sanctionedNavigation) !== JSON.stringify(['Impact Snapshots', 'EHF Fellows Articles', '/fellow-directory', '/fellow-directory-advanced-search', '/alumni-directory', '/alumni-directory-advanced-search'])) fail('review status is invalid');
  const expectedHealth = { healthy: true, captures: raw.map((item) => ({ id: item.id, ...item.local.sidecar.browserHealth, scroll: item.local.sidecar.scroll, navigation: item.local.sidecar.navigation })), sourceHostReferences: [] };
  if (!readFileSync(join(output, 'health.json')).equals(Buffer.from(`${JSON.stringify(expectedHealth, null, 2)}\n`))) fail('health output does not match raw sidecars');
  const cards = [];
  for (const item of raw) {
    for (const member of ['local', 'repeat']) {
      if (!readFileSync(join(output, member, `${item.id}.png`)).equals(item[member].png) || !readFileSync(join(output, member, `${item.id}.json`)).equals(item[member].jsonBytes)) fail(`${item.id}: bundled ${member} raw bytes mismatch`);
    }
    const sourcePng = gitShow(commit, item.sourcePng);
    const sourceJson = gitShow(commit, item.sourceJson);
    if (!readFileSync(join(output, 'source', `${item.id}.png`)).equals(sourcePng) || !readFileSync(join(output, 'source', `${item.id}.json`)).equals(sourceJson)) fail(`${item.id}: bundled source bytes mismatch`);
    const [sourceMeta, localMeta, sourceDecoded] = await Promise.all([sharp(sourcePng).metadata(), sharp(item.local.png).metadata(), sharp(sourcePng).ensureAlpha().raw().toBuffer()]);
    const canvas = { width: Math.max(sourceMeta.width, localMeta.width), height: Math.max(sourceMeta.height, localMeta.height) };
    const [normalizedSource, normalizedLocal] = await Promise.all([
      sharp(sourcePng).resize(canvas.width, canvas.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      sharp(item.local.png).resize(canvas.width, canvas.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    ]);
    if (!readFileSync(join(output, 'normalized', `${item.id}-source.png`)).equals(normalizedSource) || !readFileSync(join(output, 'normalized', `${item.id}-local.png`)).equals(normalizedLocal)) fail(`${item.id}: normalized output does not match source and raw bytes`);
    const expectedMetric = {
      id: item.id,
      source: { byteSha256: sha256(sourcePng), decodedSha256: sha256(sourceDecoded), widthPx: sourceMeta.width, heightPx: sourceMeta.height },
      local: { byteSha256: sha256(item.local.png), decodedSha256: item.local.sidecar.screenshot.decodedSha256, widthPx: localMeta.width, heightPx: localMeta.height },
      normalizationCanvas: canvas
    };
    if (!readFileSync(join(output, 'metrics', `${item.id}.json`)).equals(Buffer.from(`${JSON.stringify(expectedMetric, null, 2)}\n`))) fail(`${item.id}: metric output does not match derived inputs`);
    cards.push(await sharp(normalizedSource).resize(320, 400, { fit: 'contain', background: '#ffffff' }).png().toBuffer(), await sharp(normalizedLocal).resize(320, 400, { fit: 'contain', background: '#ffffff' }).png().toBuffer());
  }
  const expectedContact = await sharp({ create: { width: 640, height: 3200, channels: 4, background: '#ffffff' } })
    .composite(cards.map((input, index) => ({ input, left: (index % 2) * 320, top: Math.floor(index / 2) * 400 }))).png().toBuffer();
  if (!readFileSync(join(output, 'contact-sheet.png')).equals(expectedContact)) fail('contact sheet does not match normalized output');
}

async function main() {
  const { verify, rawRoot, output } = argumentsForRun(process.argv);
  if (!isAbsolute(rawRoot) || !isAbsolute(output)) fail('raw root and output must be absolute');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const captures = loadCaptureMap(commit);
  const raw = await validateRaw(rawRoot, captures, commit);
  if (verify) {
    await verifyOutput(raw, output, commit);
    return;
  }
  if (existsSync(output)) fail('output must not already exist');
  await build(raw, output, commit);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
