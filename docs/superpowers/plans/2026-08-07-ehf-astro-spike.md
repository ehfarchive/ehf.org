# EHF Astro Stage 1 Spike Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that Astro can faithfully deliver the four approved EHF routes as static pages with local, permission-scoped assets, evidence-backed responsive behavior, and a project-owner gate before any wider migration.

**Architecture:** Build one static Astro application around `SiteLayout.astro`, measured local CSS, and four deliberately distinct route templates: homepage, Impact listing, one collection-generated article, and the 2022/23 Annual Report and financial-statements page. Source evidence flows from VisualDesigner to ContentAssets and then BuildLead; BuildLead integrates typed local content and manifest-backed `/assets/...` references, validates the completed spike, and stops at `SPIKE-RESULTS.md`.

**Tech Stack:** Astro static output, TypeScript, Astro content collections, local CSS custom properties, Node scripts, Playwright, Vitest, axe-core, SHA-256 asset manifests.

---

## Authority, fixed boundary, and operating model

This is the executable plan for **Task 1 and Stage 1 Spike Tasks S1–S4 only** in `PLAN.md`. `AGENTS.md` governs project purpose, source fidelity, exclusions, and working rules. `PLAN.md` governs the baseline scripts, commands, planned files, and the Task 1/S1–S4 acceptance criteria. `docs/superpowers/specs/2026-08-07-ehf-astro-spike-design.md` governs delegation, ownership, checkpoints, evidence, and the mandatory gate. If those documents or a captured source state conflict, pause the affected item, retain the evidence, and have the manager obtain an owner decision before proceeding.

The implementation may create only these route outputs during the spike:

1. `/`
2. `/read`
3. `/read/how-chemergy-is-changing-the-game-in-waste-to-energy`
4. `/23-annual-report`

The fixed evidence viewports are desktop `1440 × 1000` and mobile `390 × 844`. There are eight default route/viewport captures and three homepage state captures: desktop Impact menu, desktop About menu, and mobile open menu. The article collection emits exactly the named Chemergy article. `/read` can have a data model suitable for future pagination, but it must not create pagination routes during the spike.

The spike excludes any fifth route, full inventory, bulk migration, redirects, deployment, analytics, production forms, directory pages or data, Hillary Institute pages, Squarespace runtime assets/CSS/JavaScript/generated DOM, invented content or interactions, and every Stage 2 task or Stage 2-only preparatory artifact. Navigation may expose final source-relative destinations that are not implemented; each must be named as intentionally unavailable in `SPIKE-RESULTS.md`.

### Owner-approved source correction

The owner approved `/23-annual-report` as the Stage 1 source route on 2026-08-07, replacing the stale `/annual-reports` route before implementation resumed. The live source is the 2022/23 Annual Report page for the Hillary Institute and Edmund Hillary Fellowship; it offers the annual report and accompanying EHF and Hillary Institute financial-statement downloads. Stage 1 treats it as one report-and-financial-statements page, not a plural archive or report grid. Any unrelated `/annual-reports` reference remains Stage 2-only.

### Role routing, ownership, and handoff contract

| Role | Required route | Owns | Must hand off |
|---|---|---|---|
| Parent manager | Management only; no implementation route | Dispatch boundaries, leases, checkpoint decisions, evidence review, owner communication | Written dispatches, accepted/rejected checkpoints, and the final owner-review request. It edits no implementation file. |
| BuildLead | `openai-codex/gpt-5.6-terra` (GPT-5.6 Terra High) | Task 1 configuration; all tests; `scripts/capture-source.mjs`, `scripts/download-assets.mjs`, `scripts/verify-local-assets.mjs`; `source-evidence/spike-routes.json`; all `src/` except the named article Markdown file and temporary visual leases; `SPIKE-RESULTS.md`; integration and verification | A manifest/content acceptance record, baseline before visual lease, final report, and all verification evidence. |
| VisualDesigner | Anthropic Claude Opus 5 High | `source-evidence/screenshots/spike--*` and every adjacent screenshot metadata JSON. During Phase 4 only, the manager grants an explicit exclusive lease over named presentational `.astro` and `src/styles/` files. | Source URL, route, viewport, state, capture time, document height, console errors, failed requests, measurements, interaction behavior, discrepancy table, changed-file list, and source-to-local comparisons. |
| ContentAssets | DeepSeek V4 Flash 0731 High through the `sonic` role | `public/assets/**`, `source-evidence/asset-manifest.json`, and `src/content/impact/how-chemergy-is-changing-the-game-in-waste-to-energy.md` | Each local path, SHA-256, source URL, permission status, attribution, retained external-document destination, and bounded article content. It edits no `.astro`, `.ts`, CSS, configuration, script, or test file. |

A model substitution requires owner approval recorded by the parent manager before that role begins. A failed, unavailable, or incomplete role does not transfer authority to another role. BuildLead is the only technical integrator and may reject a handoff whose route, source URL, destination, provenance, hash, or content structure does not agree.

### Leases and staged dispatch

| Checkpoint / phase | Manager dispatch and gate | Concurrent work allowed | Acceptance before next phase |
|---|---|---|---|
| 0 — owner review | Confirm this approved design and explicit authorization to run the four-route spike. | None. | Owner authorizes Stage 1 only; this never authorizes Stage 2. |
| 1 — source contract | Lease manifest/capture mechanism to BuildLead; lease screenshots/metadata to VisualDesigner. | BuildLead prepares the fixed manifest and capture mechanism while VisualDesigner captures the defined states. | Manager verifies four routes × two default viewports plus three homepage states, complete metadata, and route-specific measurements. No state may be inferred from another viewport. |
| 2 — bounded inputs and technical base | After a route’s Phase 1 records are accepted, dispatch ContentAssets for that route and BuildLead for Task 1/test harness/base. | ContentAssets may localize accepted assets/content while BuildLead creates configuration and test structure. | BuildLead checks permission status, provenance, SHA-256, local bytes, manifest entries, Markdown schema, and `/assets/...` references before consuming them. |
| 3 — integration | Give BuildLead exclusive integration ownership. | None on shared application files. | All four templates and captured interactions work functionally; source inputs are local or explicitly retained external report destinations. |
| 4 — visual refinement | Manager records BuildLead’s accepted baseline, enumerates only the presentational files leased to VisualDesigner, and instructs BuildLead to stop editing them. | VisualDesigner alone edits listed leased files. ContentAssets may correct only its own assets/manifest when BuildLead requests it. | VisualDesigner returns changed files and identical-state comparisons. Manager closes the lease before BuildLead resumes integration. Routing, schemas, semantic behavior, and tests remain BuildLead-owned. |
| 5 — verification, report, stop | Return all ownership to BuildLead. Manager reviews report and sends it to owner. | BuildLead finalizes verification and evidence. | `SPIKE-RESULTS.md` contains exactly one unapproved recommendation and the team stops. No Task 2 dispatch without an explicit owner `GO`. |

### Evidence matrix

| Evidence | Producer | Reviewer | Required result |
|---|---|---|---|
| Fixed four-route manifest | BuildLead | Manager | Exactly four approved paths and the two fixed viewport objects. |
| Eight default source screenshots; three homepage-state screenshots; adjacent metadata | VisualDesigner | Manager and BuildLead | Every filename, source URL, route, viewport, state, timestamp, document height, console error, and failed request is present. |
| Measured colors, type, weights, widths, gutters, spacing, crops, responsive order, and interaction behavior | VisualDesigner | BuildLead | Measurements are route/state specific and drive tokens/templates instead of guesses. |
| Local assets, permission/provenance metadata, hashes, attributions, and retained external documents | ContentAssets | BuildLead | Every consumed source asset maps deterministically to bytes under `public/assets/` or an explicit external-document destination. |
| Four static routes and one generated article | BuildLead | Manager | Route check returns success, each page has visible `main`, and local page imagery resolves from `/assets/`. |
| Desktop dropdown/mobile menu pointer and keyboard behavior | BuildLead | Manager | Captured behavior, Escape dismissal, focus restoration, body-scroll locking, and reduced-motion behavior are demonstrated at the required states. |
| No runtime Squarespace asset references | BuildLead | Manager | `src/` and `dist/` scan clean for all three prohibited domains; `source-evidence/` provenance references remain allowed. |
| Matching implementation capture and discrepancy resolution | VisualDesigner then BuildLead | Manager | Same route/viewport/state matrix; no P0/P1 or architecture-blocking P2 remains; remaining cosmetic P2/P3 is quantified. |
| Metrics, seven risk answers, result recommendation | BuildLead | Manager then owner | `SPIKE-RESULTS.md` has all prescribed values and ends with exactly one unapproved `gate recommendation:` value. |

## Planned file map

| Path | Responsibility | Owner during normal phase |
|---|---|---|
| `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts` | Static Astro application, strict TypeScript, and test commands | BuildLead |
| `src/pages/index.astro`, `src/pages/read/index.astro`, `src/pages/read/[slug].astro`, `src/pages/23-annual-report.astro` | The four approved route templates only | BuildLead, except a named Phase 4 presentational lease |
| `src/layouts/SiteLayout.astro`, `src/layouts/ArticleLayout.astro` | Shared shell and article frame | BuildLead, except a named Phase 4 presentational lease |
| `src/components/{Header,DesktopNav,MobileNav,Footer,PostCard}.astro`, `src/components/homepage/*.astro` | Shared navigation/footer, archive card, homepage sections | BuildLead, except a named Phase 4 presentational lease |
| `src/styles/{global,tokens,layout}.css` | Reset, measured tokens, responsive primitives, focus and motion behavior | BuildLead, except a named Phase 4 presentational lease |
| `src/content.config.ts` | Typed Impact collection schema | BuildLead |
| `src/content/impact/how-chemergy-is-changing-the-game-in-waste-to-energy.md` | One permission-approved typed article entry | ContentAssets |
| `scripts/{capture-source,download-assets,verify-local-assets}.mjs` | Fixed capture, bounded download, and runtime-asset verification | BuildLead |
| `source-evidence/spike-routes.json` | Fixed spike route and viewport contract | BuildLead |
| `source-evidence/screenshots/spike--*` and adjacent `*.json` | Source evidence and capture metadata | VisualDesigner |
| `source-evidence/implementation-screenshots/spike--*` and adjacent `*.json` | Same-matrix local implementation capture and metadata | BuildLead |
| `source-evidence/asset-manifest.json`, `public/assets/**` | Asset provenance and permitted local bytes | ContentAssets |
| `tests/e2e/{routes,navigation,spike,spike-visual,accessibility}.spec.ts`, `tests/unit/assets.test.ts` | Observable browser, visual, accessibility, and asset contracts | BuildLead |
| `SPIKE-RESULTS.md` | Evidence report and mandatory unapproved recommendation | BuildLead |

Commit only completed, reviewable boundaries: initial project boundary; accepted source evidence; shell and localized assets; four templates; visual/report conclusion. Do not combine unaccepted handoffs, application changes from different owners, or Stage 2 work into a spike commit.

### Task 1: Initialize the Static Project

**Owner:** BuildLead. **Phase:** 2 technical base. **Dependency:** manager has passed Checkpoint 0; no source capture is required for the test/configuration setup.

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/pages/index.astro`
- Create: `src/styles/global.css`
- Create: `tests/e2e/routes.spec.ts`
- Create: `README.md`

- [ ] **Step 1: Create the Astro project and install only the planned runtime and test packages.**

  Run:

  ```bash
  npm init -y
  npm install astro
  npm install -D typescript @astrojs/check vitest @playwright/test @axe-core/playwright
  npx playwright install chromium
  ```

  Expected: `package.json` and lockfile identify Astro, TypeScript, Playwright, Vitest, `@astrojs/check`, and `@axe-core/playwright`; Chromium is available to the configured Playwright project.

- [ ] **Step 2: Define one responsibility per project command.**

  Set the scripts in `package.json` to:

  ```json
  {
    "scripts": {
      "dev": "astro dev",
      "build": "astro check && astro build",
      "preview": "astro preview",
      "test": "npm run test:unit && npm run test:e2e",
      "test:unit": "vitest run",
      "test:e2e": "playwright test",
      "capture:source": "node scripts/capture-source.mjs",
      "assets:download": "node scripts/download-assets.mjs",
      "assets:verify": "node scripts/verify-local-assets.mjs"
    }
  }
  ```

  Expected: each future plan command resolves to exactly one script and `npm run build` remains the production static-output gate.

- [ ] **Step 3: Configure strict static output and repeatable browser tests.**

  Create these baselines:

  ```js
  // astro.config.mjs
  import { defineConfig } from 'astro/config';

  export default defineConfig({
    output: 'static',
    trailingSlash: 'never',
    build: { format: 'directory' }
  });
  ```

  ```json
  // tsconfig.json
  {
    "extends": "astro/tsconfigs/strict",
    "include": [".astro/types.d.ts", "**/*"],
    "exclude": ["dist"]
  }
  ```

  ```ts
  // vitest.config.ts
  import { defineConfig } from 'vitest/config';

  export default defineConfig({
    test: { include: ['tests/unit/**/*.test.ts'] }
  });
  ```

  ```ts
  // playwright.config.ts
  import { defineConfig, devices } from '@playwright/test';

  export default defineConfig({
    testDir: './tests/e2e',
    use: { baseURL: 'http://127.0.0.1:4321' },
    projects: [
      { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
      { name: 'mobile', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } }
    ],
    webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://127.0.0.1:4321', reuseExistingServer: !process.env.CI }
  });
  ```

  Expected: Astro emits static files and Playwright has named desktop/mobile projects matching the evidence contract.

- [ ] **Step 4: Write the observable homepage contract before its minimum implementation.**

  Create `tests/e2e/routes.spec.ts`:

  ```ts
  import { expect, test } from '@playwright/test';

  test('homepage exposes the site title and main landmark', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/Edmund Hillary Fellowship/i);
    await expect(page.getByRole('main')).toBeVisible();
  });
  ```

  Run:

  ```bash
  npm run test:e2e -- tests/e2e/routes.spec.ts
  ```

  Expected: FAIL because the initial route does not yet provide the EHF title and visible main landmark.

- [ ] **Step 5: Add the minimum static homepage and global stylesheet that satisfy the test.**

  Create `src/pages/index.astro`:

  ```astro
  ---
  import '../styles/global.css';
  ---
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width" />
      <title>Edmund Hillary Fellowship</title>
    </head>
    <body>
      <main><h1>Edmund Hillary Fellowship</h1></main>
    </body>
  </html>
  ```

  Create `src/styles/global.css`:

  ```css
  *, *::before, *::after { box-sizing: border-box; }
  html { font-family: system-ui, sans-serif; }
  body { margin: 0; }
  ```

  Run:

  ```bash
  npm run build
  npm run test:e2e -- tests/e2e/routes.spec.ts
  ```

  Expected: static build succeeds and the homepage route test passes. Later tasks replace this minimum route body through the shared layout and captured template while retaining the title and main-landmark contract.


- [ ] **Step 6: Document setup and commit the initial project boundary.**

  ```bash
  git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts playwright.config.ts src/pages/index.astro src/styles/global.css tests/e2e/routes.spec.ts README.md
  git commit -m "chore: initialize static EHF site"
  ```

  Expected: one initial-project commit contains only Task 1 configuration, minimum route/style code, test, lockfile, and setup documentation.

### Spike Task S1: Establish the fixed source contract

**Owners:** BuildLead owns the manifest and capture mechanism; VisualDesigner exclusively owns screenshots and adjacent metadata. **Phase:** 1. **Manager checkpoint:** accept the complete route/state matrix before ContentAssets localizes a route or BuildLead accepts visual choices.

**Files:**
- Create: `scripts/capture-source.mjs` (BuildLead)
- Create: `source-evidence/spike-routes.json` (BuildLead)
- Create: `source-evidence/screenshots/spike--*.png` (VisualDesigner)
- Create: `source-evidence/screenshots/spike--*.json` (VisualDesigner)

- [ ] **Step 1: Define the immutable spike route and viewport manifest.**

  Create `source-evidence/spike-routes.json`:

  ```json
  {
    "routes": [
      "/",
      "/read",
      "/read/how-chemergy-is-changing-the-game-in-waste-to-energy",
      "/23-annual-report"
    ],
    "viewports": {
      "desktop": { "width": 1440, "height": 1000 },
      "mobile": { "width": 390, "height": 844 }
    }
  }
  ```

  Expected: no capture command can add a fifth route or a different comparison viewport without a reviewed manifest change.

- [ ] **Step 2: Implement the fixed-manifest capture API.**

  BuildLead creates `scripts/capture-source.mjs` with these concrete interfaces and rules:

  ```js
  const SOURCE_ORIGIN = 'https://www.ehf.org';
  const SCROLL_INCREMENT = 600;
  const DEFAULT_STATE = 'default';

  function routeKey(route) {
    return route === '/' ? 'home' : route.slice(1).replaceAll('/', '--');
  }

  function captureStem(route, viewportName, state = DEFAULT_STATE) {
    return `spike--${routeKey(route)}--${viewportName}--${state}`;
  }

  async function scrollDeferredMedia(page) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += SCROLL_INCREMENT) await page.evaluate((top) => scrollTo(0, top), y);
    await page.evaluate(() => scrollTo(0, 0));
  }
  ```

  The script reads only `source-evidence/spike-routes.json`; rejects a route not in that file; visits `new URL(route, SOURCE_ORIGIN)`; captures each default route/viewport full page after `scrollDeferredMedia`; and writes each PNG as `source-evidence/screenshots/${captureStem(...)}.png`. It exposes an explicit `captureState(page, route, viewportName, state, action)` used only for homepage `impact-menu`, `about-menu`, and `menu-open` states. The actions open the observed live controls, wait for their visible state, then capture; they do not infer markup or state from another viewport.

  Expected: the mechanism names every source output deterministically and never crawls or captures beyond the manifest.

- [ ] **Step 3: Record adjacent capture metadata for every actual screenshot.**

  For each PNG, VisualDesigner writes the matching `.json` file containing `sourceUrl`, `route`, `viewport` (`name`, `width`, and `height`), `state`, `capturedAt`, `documentHeight`, `consoleErrors`, and `failedRequests`. `capturedAt` and `documentHeight` are the values observed for that capture, never a synthetic default.

  `consoleErrors` is an array of `{ "text": string, "location": string | null }`; `failedRequests` is an array of `{ "url": string, "failure": string | null }`. Alongside the files, VisualDesigner delivers route/state-specific measurement notes for typography, colors, weights, content widths, gutters, spacing, image crops, responsive ordering, and visible interaction behavior.

  Expected: all eleven screenshots have complete provenance and no local implementation decision depends on an unrecorded source state.

- [ ] **Step 4: Execute capture and verify the file matrix before accepting it.**

  Run:

  ```bash
  npm run capture:source
  ```

  Expected: the following exact state set exists with complete adjacent metadata: eight `default` captures for four routes × two viewports, `spike--home--desktop--impact-menu.png`, `spike--home--desktop--about-menu.png`, and `spike--home--mobile--menu-open.png`. Deferred images are loaded and each screenshot visibly corresponds to its intended live page.

- [ ] **Step 5: Manager accepts or rejects Phase 1 and commits only accepted evidence.**

  The manager checks the filenames, matrix, metadata fields, and VisualDesigner’s measurements. On conflict, missing state, or incomplete metadata, pause that route/state and obtain an owner decision; do not let ContentAssets or BuildLead guess.

  ```bash
  git add scripts/capture-source.mjs source-evidence/spike-routes.json source-evidence/screenshots
  git commit -m "chore: capture four-page EHF spike"
  ```

  Expected: the commit contains the fixed source contract and only accepted evidence, not asset localization or application implementation.

### Spike Task S2: Localize bounded inputs and implement the shared shell

**Owners:** ContentAssets owns bytes/manifest; BuildLead owns scripts, shell, tests, styles, and integration. **Phase:** 2, then Phase 3 shell integration. **Dependencies:** manager-accepted evidence for each route before extraction; BuildLead must validate every incoming manifest/content record before use.

**Files:**
- Create: `scripts/download-assets.mjs` (BuildLead)
- Create: `scripts/verify-local-assets.mjs` (BuildLead)
- Create: `source-evidence/asset-manifest.json` (ContentAssets)
- Create: `public/assets/**` (ContentAssets)
- Create: `src/styles/tokens.css`, `src/styles/layout.css` (BuildLead; a later lease may name them)
- Create: `src/components/Header.astro`, `src/components/DesktopNav.astro`, `src/components/MobileNav.astro`, `src/components/Footer.astro` (BuildLead; later lease only when enumerated)
- Create: `src/layouts/SiteLayout.astro` (BuildLead; later lease only when enumerated)
- Create: `tests/e2e/navigation.spec.ts`, `tests/unit/assets.test.ts` (BuildLead)

- [ ] **Step 1: Define the asset manifest contract and localize only accepted spike inputs.**

  ContentAssets creates `source-evidence/asset-manifest.json` as an array of this record type and writes only permission-approved local files to `public/assets/`:

  ```ts
  type AssetRecord = {
    sourceUrl: string;
    localPath: string | null;
    sha256: string | null;
    permissionStatus: 'approved-local' | 'external-only' | 'blocked';
    attribution: string;
    routeUses: Array<'/' | '/read' | '/read/how-chemergy-is-changing-the-game-in-waste-to-energy' | '/23-annual-report'>;
    retainedExternalUrl: string | null;
  };
  ```

  BuildLead implements `scripts/download-assets.mjs` to accept only manifest/evidence routes, write bytes below `public/assets/`, calculate SHA-256 with `node:crypto`, deduplicate identical byte streams, and reject an absent approval or an output path outside `public/assets/`. `external-only` records have `localPath` and `sha256` set to `null`, include `retainedExternalUrl`, and are rendered as clearly external document destinations. `blocked` records are not referenced by application code.

  Expected: every consumed asset has one deterministic local path and matching hash, or is an explicitly recorded external report link; no material advances merely because it was downloadable.

- [ ] **Step 2: Write the asset-contract test before the verifier.**

  Create `tests/unit/assets.test.ts`:

  ```ts
  import { expect, test } from 'vitest';
  import { hasForbiddenRuntimeAssetReference, validateAssetRecord } from '../../scripts/verify-local-assets.mjs';

  test('rejects a Squarespace runtime URL', () => {
    expect(hasForbiddenRuntimeAssetReference('https://static1.squarespace.com/media/a.png')).toBe(true);
  });

  test('accepts a complete approved local asset record', () => {
    expect(validateAssetRecord({
      sourceUrl: 'https://www.ehf.org/image.jpg',
      localPath: '/assets/image.jpg',
      sha256: 'a'.repeat(64),
      permissionStatus: 'approved-local',
      attribution: 'EHF',
      routeUses: ['/'],
      retainedExternalUrl: null
    })).toEqual([]);
  });
  ```

  Run:

  ```bash
  npm run test:unit -- tests/unit/assets.test.ts
  ```

  Expected: FAIL because the verifier exports do not exist.

- [ ] **Step 3: Implement the verifier and make the asset test green.**

  `scripts/verify-local-assets.mjs` exports these names for the unit test and scans only application/runtime output:

  ```js
  export const forbiddenRuntimeDomains = [
    'squarespace-cdn.com',
    'static1.squarespace.com',
    'assets.squarespace.com'
  ];

  export function hasForbiddenRuntimeAssetReference(value) {
    return forbiddenRuntimeDomains.some((domain) => value.includes(domain));
  }

  export function validateAssetRecord(record) {
    const errors = [];
    if (record.permissionStatus === 'approved-local' && (!record.localPath?.startsWith('/assets/') || !/^[a-f0-9]{64}$/.test(record.sha256 ?? ''))) errors.push('approved local asset needs /assets path and SHA-256');
    if (record.permissionStatus === 'external-only' && !record.retainedExternalUrl) errors.push('external-only asset needs retainedExternalUrl');
    return errors;
  }
  ```

  The executable portion recursively reads `src/` and `dist/`, fails non-zero on any forbidden-domain runtime reference, validates each manifest record, confirms each approved-local path exists beneath `public/assets/`, and never treats provenance references under `source-evidence/` as runtime violations.

  Run:

  ```bash
  npm run test:unit -- tests/unit/assets.test.ts
  npm run assets:verify
  ```

  Expected: the unit contract passes and the verifier passes only when every local record/hash/path is valid and no source/runtime output hotlinks a prohibited domain.

- [ ] **Step 4: Translate accepted measurements into one token layer and shared layout primitives.**

  BuildLead transcribes every accepted literal measurement into `src/styles/tokens.css` as a semantic custom property for color, display/body font family and weight, content width, desktop/mobile gutter, spacing scale, motion duration, and navigation breakpoint. Each token declaration holds the observed literal value and a single source measurement reference. No token has a provisional, inferred, or browser-default value.

  In `src/styles/layout.css`, BuildLead consumes the width and gutter tokens through `.site-container`, adds the accepted navigation breakpoint as a literal `@media` condition, and defines the verified reduced-motion override:

  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

  No Squarespace stylesheet, generated DOM, guessed token, or CSS custom property used as an `@media` condition may be introduced.

  Expected: all later templates share measured dimensions, typography, focus behavior, and reduced-motion behavior without duplicating visual constants.

- [ ] **Step 5: Write shared-navigation behavior tests before component implementation.**

  Create `tests/e2e/navigation.spec.ts`:

  ```ts
  import { expect, test } from '@playwright/test';

  test('desktop Impact dropdown opens by keyboard and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: /impact/i });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: /impact submenu/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: /impact submenu/i })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('mobile menu locks page scroll and restores focus when dismissed', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile menu contract');
    await page.goto('/');
    const trigger = page.getByRole('button', { name: /menu/i });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/menu-open/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /site navigation/i })).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
    await expect(trigger).toBeFocused();
  });
  ```

  Run:

  ```bash
  npm run test:e2e -- tests/e2e/navigation.spec.ts
  ```

  Expected: FAIL until the shared shell exposes the named controls and behavior.

- [ ] **Step 6: Implement one semantic site shell and the captured desktop/mobile interactions.**

  `SiteLayout.astro` accepts `title` and renders `<Header />`, exactly one `<main>`, and `<Footer />`. `Header.astro` composes `DesktopNav.astro` and `MobileNav.astro`; it does not duplicate destination data. `DesktopNav.astro` uses buttons with `aria-expanded` and named submenu navigation regions for the captured Impact and About menus. `MobileNav.astro` uses a named dialog, saves the triggering element before opening, adds/removes `body.menu-open`, returns focus on Escape or close, and has no animation dependency under reduced motion.

  The public interaction boundary is:

  ```ts
  type NavigationItem = { label: string; href: string; children?: Array<{ label: string; href: string }> };

  function openMenu(trigger: HTMLButtonElement): void;
  function closeMenu(): void;
  ```

  `Footer.astro` uses measured responsive markup and final source-relative links. It does not invent a newsletter backend; any presentation-only affordance is non-submitting unless accepted source evidence establishes an external destination. Links outside the four routes retain their source-relative URL and are later recorded as intentionally unavailable.

  Expected: desktop dropdowns, the mobile full-screen menu, Escape, focus restoration, body-scroll locking, pointer behavior, keyboard behavior, and reduced-motion behavior match the accepted captured states at the matching viewport.

- [ ] **Step 7: Prove the shell contract, accept the handoff, and commit the bounded boundary.**

  Run:

  ```bash
  npm run test:e2e -- tests/e2e/navigation.spec.ts
  npm run assets:verify
  ```

  Expected: navigation passes in the relevant desktop/mobile projects and the verifier finds no prohibited runtime dependency. BuildLead records its manifest/content acceptance before using ContentAssets output.

  ```bash
  git add scripts/download-assets.mjs scripts/verify-local-assets.mjs public/assets source-evidence/asset-manifest.json src/styles src/components src/layouts tests/e2e/navigation.spec.ts tests/unit/assets.test.ts
  git commit -m "feat: build EHF spike shell and local assets"
  ```

  Expected: one reviewable commit contains accepted local inputs, shell, tokens/layout, verifier, and their tests—never VisualDesigner-owned source screenshots.

### Spike Task S3: Build and verify the four distinct templates

**Owner:** BuildLead, consuming only accepted ContentAssets inputs. **Phase:** 3. **Dependency:** S2 shell, manifest, assets, and navigation contract are accepted. **Boundary:** exactly the four routes; no `read/page/[page].astro`, extra collection entries, or other route template is created.

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/pages/read/index.astro`, `src/pages/read/[slug].astro`, `src/pages/23-annual-report.astro`
- Create: `src/components/PostCard.astro`, `src/components/homepage/HomeHero.astro`, `src/components/homepage/ImpactOverview.astro`
- Create: `src/layouts/ArticleLayout.astro`, `src/content.config.ts`
- Create: `src/content/impact/how-chemergy-is-changing-the-game-in-waste-to-energy.md` (ContentAssets only)
- Create: `tests/e2e/spike.spec.ts`

- [ ] **Step 1: Write the four-route, one-article observable contract.**

  Create `tests/e2e/spike.spec.ts`:

  ```ts
  import { expect, test } from '@playwright/test';

  const spikeRoutes = [
    '/',
    '/read',
    '/read/how-chemergy-is-changing-the-game-in-waste-to-energy',
    '/23-annual-report'
  ] as const;

  for (const route of spikeRoutes) {
    test(`${route} renders static EHF content with local imagery`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.locator('main img').first()).toHaveAttribute('src', /^\/assets\//);
    });
  }

  test('the Impact collection emits only the approved spike article', async ({ page }) => {
    await page.goto('/read');
    await expect(page.getByRole('link', { name: /how chemergy is changing the game in waste to energy/i })).toHaveAttribute('href', '/read/how-chemergy-is-changing-the-game-in-waste-to-energy');
  });
  ```

  Run:

  ```bash
  npm run test:e2e -- tests/e2e/spike.spec.ts
  ```

  Expected: FAIL until every route uses the shared shell, a visible main landmark, and manifest-backed local imagery.

- [ ] **Step 2: Define the typed one-entry content collection and receive the bounded Markdown handoff.**

  BuildLead creates `src/content.config.ts` with a schema that covers the accepted article values:

  ```ts
  import { defineCollection, z } from 'astro:content';

  const impact = defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      publishedAt: z.coerce.date(),
      excerpt: z.string(),
      heroImage: z.string().regex(/^\/assets\//),
      heroAlt: z.string(),
      nextSlug: z.string().optional()
    })
  });

  export const collections = { impact };
  ```

  ContentAssets writes only `src/content/impact/how-chemergy-is-changing-the-game-in-waste-to-energy.md`. Its frontmatter contains the schema-required `title`, `publishedAt`, `excerpt`, `heroImage`, and `heroAlt` fields using the actual accepted public source values; `heroImage` is the manifest-approved `/assets/...` path. The Markdown body contains the accepted article copy, headings, figures, captions, and external links exactly as bounded by the accepted source/material-permission handoff.

  BuildLead validates that the `heroImage` manifest entry is `approved-local`, hash-verified, and route-scoped before integration.

  Expected: the build has a typed collection with exactly one accepted Markdown entry and no remote content fetch.

- [ ] **Step 3: Implement the archive/article data contract before their route templates.**

  `PostCard.astro` accepts this stable API:

  ```ts
  interface Props {
    title: string;
    href: string;
    excerpt: string;
    image: string;
    imageAlt: string;
  }
  ```

  It renders one semantic article/card with an `/assets/...` image and a source-relative article link. `ArticleLayout.astro` accepts the same article fields plus rendered Markdown and optional accepted next-article data; it renders source-faithful title, date, figure/caption, external-link treatment, and title-only next-article link without an avatar or `Next` label. `src/pages/read/index.astro` calls `getCollection('impact')` and passes normalized values to `PostCard`; it does not implement a pagination route. `src/pages/read/[slug].astro` uses `getStaticPaths()` over that collection and emits only the available one-entry slug.

  Expected: card API supports later build-time pagination without API changes, while the spike output remains limited to `/read` and one article.

- [ ] **Step 4: Replace the initial homepage with the captured closure composition.**

  BuildLead rewrites `src/pages/index.astro` to use `SiteLayout` and two focused source-mapped components:

  ```text
  HomeHero.astro       — title, closure copy, three statistics, Fellows Directory CTA, local hero image, measured gradient
  ImpactOverview.astro — one local-image-backed band containing “EHF - The Organisation” and the complete two-sentence “The Fellowship” copy
  ```

  The hero owns its statistics and CTA. The image-backed band owns both Organisation and Fellowship content. Preserve measured crop, gradient, responsive source order, shared header, and footer; do not add a standalone legacy strip, logo marquee, or callout band.

  Expected: the homepage has only its two captured content sections before the shared footer, split by real source responsibility.

- [ ] **Step 5: Implement the remaining two templates from accepted content evidence.**

  `src/pages/read/index.astro` recreates the captured first-page card grid with no visible archive title, source-observed round-robin desktop placement (cards 1–4 in the first visual row), and its single-column mobile source order. It uses only the one-entry/accepted bounded source data shape and local card media. `src/pages/23-annual-report.astro` recreates the accepted 2022/23 Annual Report page with its annual-report download, the two accompanying financial-statement downloads, captions, and attribution. Approved-local report documents use `/assets/...`; an `external-only` manifest record renders a clearly identified external link using `retainedExternalUrl`, never a hotlinked image/font/script or a falsely local document.

  All four templates call `SiteLayout` so each returns the same semantic header/main/footer shape. No fifth route, fallback route, generated pagination path, bulk collection import, redirect, or Stage 2-only artifact is added.

  Expected: four distinct templates demonstrate Astro composition without collapsing the different source layouts into a generic page.

- [ ] **Step 6: Make the route contract green and commit only the four-template slice.**

  Run:

  ```bash
  npm run build
  npm run assets:verify
  npm run test:e2e -- tests/e2e/spike.spec.ts
  ```

  Expected: static build succeeds; all four routes respond successfully; each has visible main content and local page imagery; exactly the one Chemergy article is generated; and `src/` plus `dist/` have no prohibited Squarespace runtime references.

  ```bash
  git add src/pages src/components/PostCard.astro src/components/homepage src/layouts/ArticleLayout.astro src/content.config.ts src/content tests/e2e/spike.spec.ts
  git commit -m "feat: implement four-page EHF Astro spike"
  ```

  Expected: this commit contains the four route templates, article/content contract, focused homepage components, and their observable test—not screenshots, raw assets, or Stage 2 routes.

### Spike Task S4: Perform the exclusive comparison, report the result, and stop

**Owners:** VisualDesigner has the temporary Phase 4 presentational lease; BuildLead owns baseline, test contracts, final integration, metrics, verification, and report. **Phase:** 4 then 5. **Hard boundary:** no implementation proceeds to Task 2 regardless of build/test outcome until the owner explicitly authorizes `GO` after reviewing `SPIKE-RESULTS.md`.

**Files:**
- Create: `tests/e2e/spike-visual.spec.ts`, `tests/e2e/accessibility.spec.ts` (BuildLead)
- Create: `source-evidence/implementation-screenshots/spike--*.png` and adjacent `*.json` (BuildLead)
- Modify: only manager-enumerated presentational `src/styles/*.css` and `.astro` files during the VisualDesigner lease (VisualDesigner)
- Create: `SPIKE-RESULTS.md` (BuildLead)

- [ ] **Step 1: Establish a BuildLead baseline and write the matching visual-state contract.**

  BuildLead records the accepted commit/baseline and the exact set of presentational files to lease before VisualDesigner changes anything. Create `tests/e2e/spike-visual.spec.ts` with the same route/viewport/state matrix used by S1:

  ```ts
  import { expect, test } from '@playwright/test';

  const defaults = ['/', '/read', '/read/how-chemergy-is-changing-the-game-in-waste-to-energy', '/23-annual-report'] as const;

  for (const route of defaults) {
    test(`${route} matches its default evidence state`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveScreenshot();
    });
  }

  test('homepage matches captured navigation states', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /impact/i }).click();
    await expect(page).toHaveScreenshot('home-impact-menu.png');
  });
  ```

  Add equivalent explicit About-menu and mobile-open-menu tests using the captured accessible controls and the correct named Playwright project. Configure screenshots so fonts and local images are ready before capture:

  ```ts
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.complete ? undefined : new Promise((resolve) => image.addEventListener('load', resolve, { once: true }))));
  ```

  For every test state after fonts/images are ready, BuildLead additionally writes a full-page implementation PNG to `source-evidence/implementation-screenshots/` using the same `spike--<route-key>--<viewport>--<state>.png` convention as S1 and writes an adjacent JSON record with the same provenance fields plus `"implementationUrl": "http://127.0.0.1:4321<route>"`. The eleven implementation records therefore map one-to-one to the eleven accepted source records before VisualDesigner begins comparison.

  Run:

  ```bash
  npm run test:e2e -- tests/e2e/spike-visual.spec.ts
  ```

  Expected: the first run creates or exposes the required comparison baselines; it cannot claim fidelity without comparisons against accepted S1 evidence.

- [ ] **Step 2: Grant and execute the exclusive visual-refinement lease.**

  The manager sends VisualDesigner the baseline and a closed, exact list of only those presentational files shown by the completed comparison to require refinement. The dispatch names every leased path individually and states its baseline commit. BuildLead stops editing every named file until the manager closes the lease; unlisted files remain with their normal owner.

  VisualDesigner compares each implementation capture with its source capture at the identical route, viewport, and state. It changes only lease-listed presentational values: measured tokens, spacing, typography, crop/object positioning, colors, gradients, responsive order, and captured motion presentation. It does not change routes, content schema, data contracts, semantic behavior, tests, scripts, configuration, or unleased files. It records every difference as a severity, route, viewport, state, difference, and resolution.

  Expected: no concurrent edit changes a leased file; every visual change is source-evidence-backed; VisualDesigner returns its changed-file list and comparison table to the manager.

- [ ] **Step 3: Close the lease, resolve functional conflicts, and classify every remaining difference.**

  The manager closes the lease after receiving the changed-file list. BuildLead integrates only the returned files, reruns the functional contracts, and adds every comparison result to `SPIKE-RESULTS.md` using this exact table:

  ```md
  | Severity | Route | Viewport | State | Difference | Resolution |
  |---|---|---|---|---|---|
  ```

  Resolve every P0 and P1. Also resolve every P2 that questions Astro, a page template, or reusable CSS. Quantify any remaining cosmetic P2/P3 with route/state, measured difference, and follow-up impact; do not call it resolved merely because the build succeeds.

  Expected: the report separates fixed issues from evidence-backed remaining follow-up and contains no unresolved release-blocking visual category.

- [ ] **Step 4: Write and run the accessibility, console, and local-link contracts.**

  Create `tests/e2e/accessibility.spec.ts`:

  ```ts
  import AxeBuilder from '@axe-core/playwright';
  import { expect, test } from '@playwright/test';

  const routes = ['/', '/read', '/read/how-chemergy-is-changing-the-game-in-waste-to-energy', '/23-annual-report'] as const;

  for (const route of routes) {
    test(`${route} has no serious or critical accessibility violations`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      await page.goto(route);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
  ```

  Add a local-link assertion to `tests/e2e/spike.spec.ts`: collect unique `a[href^="/"]` values from each spike page, ignore the intentionally unavailable source-relative destinations listed in the report, and require every remaining local link to return a successful response. Run:

  ```bash
  npm run test:e2e -- tests/e2e/accessibility.spec.ts tests/e2e/spike.spec.ts
  ```

  Expected: each spike route has no serious/critical axe finding or browser console error, and every implemented internal destination resolves successfully. Any failure is fixed before `GO`, or recorded with exact evidence as an `ADJUST`/`STOP` blocker.

- [ ] **Step 5: Record the prescribed measurements and answer the seven architecture risks with evidence.**

  BuildLead records in `SPIKE-RESULTS.md`: implementation elapsed time; production build time; generated route count; total `dist/` size; total first-party JavaScript bytes per route; local asset count and size; automated-test count and failures; unresolved P2/P3 count; and source blocks requiring manual cleanup.

  Then answer, citing the exact screenshots, manifest entries, test files/results, or build output used: (1) whether Astro can reproduce the four layouts; (2) whether source content became maintainable Markdown/typed data; (3) whether localization is deterministic without hotlinks; (4) whether shared navigation/footer work without a site-wide client framework; (5) whether reusable CSS reaches desktop/mobile fidelity; (6) whether remaining pages can reuse these primitives rather than mostly unique templates; and (7) the elapsed-time estimate replacing the original full-site estimate.

  Expected: measurements are observed values, not estimates, and every risk conclusion identifies its supporting evidence or its unresolved blocker.

- [ ] **Step 6: Run the final evidence suite and make the recommendation evidence-only.**

  Run:

  ```bash
  npm run build
  npm run assets:verify
  npm run test:unit
  npm run test:e2e -- tests/e2e/spike.spec.ts tests/e2e/navigation.spec.ts tests/e2e/spike-visual.spec.ts tests/e2e/accessibility.spec.ts
  ```

  Expected: all checks pass, or every failure remains in `SPIKE-RESULTS.md` with evidence sufficient for `ADJUST` or `STOP`. Preserve browser-console, broken-link, missing-asset, accessibility, keyboard/pointer, and reduced-motion evidence required by `AGENTS.md`, `PLAN.md`, and the design.

  End `SPIKE-RESULTS.md` with **exactly one** unapproved line and no text after it:

  ```text
  gate recommendation: GO
  ```

  or:

  ```text
  gate recommendation: ADJUST
  ```

  or:

  ```text
  gate recommendation: STOP
  ```

  Expected: the line is a technical recommendation backed by evidence, never authorization to begin Stage 2.

- [ ] **Step 7: Commit the report boundary and enact the hard stop.**

  ```bash
  git add SPIKE-RESULTS.md tests/e2e/spike-visual.spec.ts tests/e2e/accessibility.spec.ts source-evidence/implementation-screenshots src
  git commit -m "docs: evaluate EHF Astro spike"
  ```

  Expected: the final Stage 1 commit contains the report, visual contract, and only fidelity fixes actually made during comparison. Manager presents the report to the project owner and stops all implementation. **Do not begin Task 2, inventory any wider route set, migrate more content, or create Stage 2 files unless the owner gives an explicit `GO` after reviewing this report.**

## Final Stage 1 completion checklist

- [ ] The four approved static routes and only one generated Chemergy article are represented by source evidence, manifest-backed local/explicit external inputs, route tests, and implementation screenshots.
- [ ] VisualDesigner’s eleven source state records and measurements were accepted before route-specific visual decisions; ContentAssets’ accepted local files/manifest/article were validated by BuildLead before consumption.
- [ ] BuildLead’s shared shell passes pointer/keyboard desktop dropdown and mobile menu checks, including Escape, focus restoration, body-scroll locking, and reduced motion.
- [ ] Runtime source and built output contain no Squarespace asset-domain reference; `source-evidence/` retains provenance without becoming runtime input.
- [ ] `SPIKE-RESULTS.md` has discrepancy severity/resolution records, all required metrics, seven risk answers, retained blockers where applicable, and exactly one unapproved recommendation.
- [ ] The manager has stopped at the mandatory owner gate. No Stage 2 action, preparation, route, migration, or dispatch has begun.
