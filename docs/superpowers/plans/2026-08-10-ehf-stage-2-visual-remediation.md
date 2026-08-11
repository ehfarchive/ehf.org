# EHF Stage 2 Visual Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate every owner-authorized P1/P2 visual blocker in the unaccepted Ticket 8–10 template families, accepting each family only after one fresh Opus recheck, before the existing Stage 2 integrity and final QA gates.

**Architecture:** The remediation is a strict serial wave: Ticket 8 owns programme and the required shared navigation correction; Ticket 9 begins only after Ticket 8 receives an ACCEPTED fresh review and consumes that accepted shared shell; Ticket 10 begins only after Ticket 9 ACCEPTS. Each ticket first creates observable RED assertions, changes only the named source/template/style/data contracts, regenerates its complete existing compact evidence bundle, and receives exactly one fresh no-edit `anthropic/claude-opus-5` recheck. Source screenshots and route/content/asset manifests remain authoritative; route exclusions are policy, not fidelity defects.

**Tech Stack:** Astro 7 static output, TypeScript strict mode, local CSS, local JSON/Markdown content inputs, Node bundle metadata, Vitest, Playwright, and the existing `captureComparable()` visual-test helper.

---

## Starting boundary and permanent rules

- **Authorized starting state:** `feature/ehf-stage-2-implementation` at `427ceb2f049dac34f20ee222c7dc8abf228a55d0`, clean working tree; BuildLead runtime is exactly `openai-codex/gpt-5.6-terra`.
- **Visual reviewer:** `anthropic/claude-opus-5`, reviewer-only. It receives only the regenerated bundle, classifies P0–P3, and makes no browser, capture, or repository action.
- **Serial gates:** Ticket 8 correction → complete Ticket 8 bundle → one fresh Opus review → **ACCEPT**; only then Ticket 9. Ticket 9 follows the same gate before Ticket 10. Ticket 11 starts only after all three reviews report P0/P1/P2 = `0/0/0`. Ticket 12 starts only after Ticket 11 accepts.
- **Exactly one recheck per ticket:** These owner-authorized corrections replace the exhausted historical call paths. There is no automatic second correction, recapture, recheck, model fallback, acceptance-by-waiver, merge, deploy, preview, or production action. A fresh P0/P1/P2, provider error, missing bundle integrity record, or failed targeted command stops at that ticket and is returned to the owner with the bundle path, exact findings, and failed command.
- **Shared ownership:** A shared-shell fix belongs to its first owner. Ticket 8 owns the Impact submenu correction and unshadowed desktop submenu surface; Ticket 9 consumes those results and owns only its required About active state. Later bundles always recapture the shared state after its earliest accepted owner lands the fix.
- **Sanctioned navigation disposition:** Do not add the Fellow Directory header CTA or footer item, its related directory routes, or any Hillary Institute route. The manifest excludes `EHF Fellows Articles`; preserve that exclusion and document it in each bundle/review status as a sanctioned omission, not as a P2. Existing excluded/dead paths are never restored merely to reproduce a visible source link. Ticket 9 preserves the recorded malformed legal `href` bytes and the source defects listed in the existing Ticket 9 contract.
- **P3 boundary:** Preserve current accepted P3 residuals unless a listed P1/P2 source change necessarily removes one. In particular, retain Ticket 8’s accepted annual-report parity and resolved `VD8-001`, `VD8-005`, and `VD8-012`; Ticket 10 retains display-only no-send/no-success/value-retention behavior and resolved `R2`.

## File map and correction ownership

| Ticket | Files to modify | Why |
| --- | --- | --- |
| 8 | `src/components/EventProgrammePage.astro`; `src/data/site.ts`; `src/components/DesktopNav.astro`; `src/styles/layout.css`; `tests/e2e/routes.spec.ts`; `tests/e2e/navigation.spec.ts`; `tests/e2e/visual.spec.ts` | Source-measured programme grid/tabs plus the shared Impact submenu and its desktop paint. |
| 9 | `src/lib/rich-text.ts`; `src/components/RichTextBlock.astro`; `src/lib/page-data.ts`; `src/components/StandardPage.astro`; `src/components/LegalPage.astro`; `src/components/Footer.astro`; `src/pages/[...page].astro`; `src/pages/404.astro`; `src/layouts/SiteLayout.astro`; `src/components/Header.astro`; `src/components/DesktopNav.astro`; `src/styles/layout.css`; `src/content/pages/institutional/summer-edition-2025.json`; `tests/unit/rich-text.test.ts` (create); `tests/unit/page-data.test.ts`; `tests/e2e/routes.spec.ts`; `tests/e2e/navigation.spec.ts`; `tests/e2e/visual.spec.ts` | Preserve structured source rich text, use distinct institutional/legal/Summer/404 presentations, remove the non-source family footer treatment, and expose the About active-nav state without reopening Ticket 8 shell work. |
| 10 | `src/components/DisplayOnlyForm.astro`; `tests/e2e/forms.spec.ts`; `tests/e2e/visual.spec.ts` | Correct the common form typography and checkbox geometry without changing form route data, network behavior, footer, or shared shell. |
| 11–12 | Existing detailed sections in `docs/superpowers/plans/2026-08-09-ehf-stage-2.md` only | Execute unchanged after their prerequisites; this plan does not duplicate or relax them. |

No manifest, redirect, asset, source-capture, package, lockfile, new route, Fellow Directory, Hillary Institute, backend, payment, or deployment change is part of this wave. Ticket 9 removes only the currently rendered non-source desktop newsletter markup from its shared footer.

### Task 1: Ticket 8 — restore programme geometry and the required shared Impact submenu

**Files:**
- Modify: `src/components/EventProgrammePage.astro`
- Modify: `src/data/site.ts`
- Modify: `src/components/DesktopNav.astro`
- Modify: `src/styles/layout.css`
- Modify: `tests/e2e/routes.spec.ts`
- Modify: `tests/e2e/navigation.spec.ts`
- Modify: `tests/e2e/visual.spec.ts`
- Evidence only: `/tmp/ehf-ticket8-events-reports-bundle/**`

- [ ] **Step 1: Write the Ticket 8 RED contracts before changing production code.**

  Extend the existing `Ticket 8 representative event and report matrix preserves active source states, local media, content order, and responsive grids` test in `tests/e2e/visual.spec.ts` and add its named route/navigation assertions. At desktop, assert the programme schedule’s computed grid has a 111px time column, `#ccc` outer left/right borders and time rule, `#eee` notice rows, 18px horizontal cell padding, 18px vertical row padding, and a 72px single-line row box. Assert the two known source ranges `5.30pm - 6.30pm` and `7.00pm - 9.00pm` wrap in the time cell. At mobile, assert the tab has left-aligned 13px text, 33px line-height, and a minimum 115px tab box. In both projects, assert the programme header-to-tab spacing is source-sized and every source break row has `rgb(238, 238, 238)`.

  Add shared-shell assertions that the Impact folder contains exactly the two included destinations `Read and Watch` and `EHF Community Collective`, has no `EHF Fellows Articles` anchor, and renders bare right-aligned submenu text with transparent background and `boxShadow === 'none'` on desktop. Include the explicit sanction assertion that no header or footer anchor points to `/fellow-directory`, `/fellow-directory-advanced-search`, `/alumni-directory`, or `/alumni-directory-advanced-search`.

  Run:
  ```bash
  npx playwright test tests/e2e/routes.spec.ts tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts --grep "Ticket 8|programme|Impact folder"
  ```
  Expected: FAIL on the current 108px minimum/fractional time column, `#e2e2e2`/missing outside rules, compressed rows/tabs, missing Impact items, and white shadowed desktop submenu; existing Annual Report assertions remain green.

- [ ] **Step 2: Make the minimal programme source-level correction.**

  In `EventProgrammePage.astro`, retain `parseInline()`, the two-day state machine, `data-event-*` hooks, tabs, `aria-selected`, and the resolved track/speaker markup. Change only the schedule/table CSS so the dominant programme element matches the source: a fixed 111px desktop time column; `1px solid #ccc` outer/table and time-column rules; 18px horizontal and 18px vertical item-cell padding; `#eee` on every source break/notice item rather than only `:first-of-type`; track fills remain their currently resolved source colours; and the day-tab header margin becomes the measured source gap. In the mobile media block, retain two equal tabs but set source-sized, left-aligned tab type and minimum box height; do not alter desktop tabs or the keyboard tab-panel implementation.

  Classify break/notice rows from the already parsed programme input by adding a narrow `isProgrammeBreak` predicate that matches the eight source labels (`Registration Opens`, `Morning Break - Say hello to someone new!`, `Take a moment and make your way to your first breakout session`, `Lunch`, `Afternoon Break`, `Drinks and networking`, `Dinner`, and `Event concludes`) and adds an `event-programme__item--break` class to only those entries. It must not change text, item order, day membership, track ownership, or the empty time cells already validated by `VD8-005`.

- [ ] **Step 3: Make the Ticket 8 shared-shell correction without reopening excluded routes.**

  In `src/data/site.ts`, keep `primaryNavigation` manifest-backed. Keep the two included Impact children and add neither excluded `EHF Fellows Articles` nor any directory record. In `DesktopNav.astro`, add stable `data-desktop-submenu` and `data-nav-item` hooks but do not change menu event semantics. In `layout.css`, replace only `.desktop-nav__submenu` surface styling with source-like transparent, unrounded, unshadowed, right-aligned text geometry; preserve submenu positioning, item pitch, focus visibility, and the mobile menu stylesheet. Do not change `Footer.astro`, `NewsletterForm.astro`, header directory omission, or any existing Annual Report style.

- [ ] **Step 4: Prove Ticket 8 GREEN and create its sole correction commit.**

  Run:
  ```bash
  npx playwright test tests/e2e/routes.spec.ts tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts --grep "Ticket 8|programme|Impact folder"
  ```
  Expected: PASS; programme source assertions, tab keyboard behavior, Impact included-item assertions, excluded-navigation assertions, and all Annual Report controls/grid assertions pass.

  Commit only the Task 1 source and test paths:
  ```bash
  git add src/components/EventProgrammePage.astro src/data/site.ts src/components/DesktopNav.astro src/styles/layout.css tests/e2e/routes.spec.ts tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts
  git commit -m "fix: remediate EHF programme visual blockers"
  ```
  Expected: one Ticket 8 correction commit; no evidence, manifest, content, or unrelated shared-shell files staged.

- [ ] **Step 5: Regenerate the complete Ticket 8 evidence packet exactly once.**

  From the committed correction, run the same one batched Playwright matrix used by the existing Ticket 8 visual test: `/2025-summit-programme` default desktop/mobile and nav-impact-open desktop/mobile; `/23-annual-report` default desktop/mobile and nav-about-open desktop/mobile. Use `captureComparable()` so the nav-open mobile interactions retain `requestedMobilePanelActive` and `mobileRootShifted`. Copy the immutable committed source PNG/JSON pairs; capture local and independent repeat PNG/JSON pairs; regenerate normalized source/local strips, all eight geometry records, the contact sheet, `health.json`, `review-status.json`, and `bundle-manifest.json` under `/tmp/ehf-ticket8-events-reports-bundle`.

  Run the exact focused matrix command:
  ```bash
  npx playwright test tests/e2e/visual.spec.ts --grep "Ticket 8 representative event and report matrix"
  ```
  Expected: both projects pass while producing all eight local/repeat state records from the correction commit.

  The regenerated manifest must inventory every file except itself with path, byte length, and SHA-256; its `contentTreeSha256` must be computed from the documented newline-delimited sorted `sha256␠␠relative-path` inventory serialization and the manifest must record that serialization. Require source immutability 8/8, local/repeat byte identity 8/8, zero console errors/failed requests/unloaded images/source-host references, and explicit `sanctionedNavigation` rows for `EHF Fellows Articles` and all Fellow Directory surfaces. Record `VD8-001`, `VD8-005`, and `VD8-012` as preserved resolved findings and Annual Report as parity-preserved, not as re-opened candidates.

- [ ] **Step 6: Run exactly one fresh Ticket 8 Opus recheck and apply the hard gate.**

  Give `anthropic/claude-opus-5` only the regenerated Ticket 8 packet: manifest, health, contact sheet, all eight metrics, sixteen normalized pairs, and raw source/local images only when necessary to judge a suspected defect. Require a verdict that explicitly classifies `VD8F-01` through `VD8F-06`, the shared Impact submenu/surface state, the sanctioned exclusions, and Annual Report parity.

  **Acceptance:** review reports P0/P1/P2 = `0/0/0`; no new shared-shell regression; all bundle integrity conditions above hold. Record the review in the private ledger and Ticket 8 handoff, then release the Ticket 8 lease.

  **Stop:** any P0/P1/P2, provider error, missing/changed immutable source pair, non-identical repeat, stale/nonreproducible digest, or failed focused command. Return the Ticket 8 blocker to the owner; do not start Ticket 9 or make another Ticket 8 correction.

### Task 2: Ticket 9 — restore institutional, legal, Summer Edition, 404, and About-active fidelity

**Prerequisite:** Ticket 8 is ACCEPTED under Task 1. Capture this Ticket 9 bundle from the accepted Ticket 8 shared shell.

**Files:**
- Create: `tests/unit/rich-text.test.ts`
- Modify: `src/lib/rich-text.ts`
- Modify: `src/components/RichTextBlock.astro`
- Modify: `src/lib/page-data.ts`
- Modify: `src/components/StandardPage.astro`
- Modify: `src/components/LegalPage.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/pages/[...page].astro`
- Modify: `src/pages/404.astro`
- Modify: `src/layouts/SiteLayout.astro`
- Modify: `src/components/Header.astro`
- Modify: `src/components/DesktopNav.astro`
- Modify: `src/styles/layout.css`
- Modify: `src/content/pages/institutional/summer-edition-2025.json`
- Modify: `tests/unit/page-data.test.ts`
- Modify: `tests/e2e/routes.spec.ts`
- Modify: `tests/e2e/navigation.spec.ts`
- Modify: `tests/e2e/visual.spec.ts`
- Evidence only: `/tmp/ehf-ticket9-institutional-legal-bundle/**`

- [ ] **Step 1: Add RED rich-text/data tests for the exact source structure.**

  Create `tests/unit/rich-text.test.ts`. Specify `parseRichTextBlocks(value: string): readonly RichTextBlock[]` so blank lines create distinct paragraphs, consecutive `- ` or `• ` lines create one list block with ordered/list-item children, `**name**`, `*credit*`, and `[label](href)` retain their nodes, and a run-in such as `*Fellow* means` emits the literal space between `emphasis` and the following text. Add Summer-specific assertions that the body creates one bold `Rangimarie Parata Takurua` sentence subject (not a standalone duplicate); keeps `kura-a-iwi` and `Puku Māra`; emits individual project list rows; emits inline underlined links rather than a list; and emits image-credit text directly below each corresponding image.

  Extend `tests/unit/page-data.test.ts` so `loadPageSections()` returns a per-section media array rather than the current implicit `supplementalSummerImages` side table, preserving exact route and link-count validation. Add a failure assertion for a route whose `body`, `links`, or media sequence cannot be consumed exactly once.

  Run:
  ```bash
  npm run test:unit -- tests/unit/rich-text.test.ts tests/unit/page-data.test.ts
  ```
  Expected: FAIL because `parseRichTextBlocks()`, explicit per-section media/credit data, and exact Summer structured content do not exist.

- [ ] **Step 2: Add RED browser contracts for every Ticket 9 blocker.**

  Extend the existing Ticket 9 tests with source-observable assertions:

  - `/privacy-policy`: prose and lists use the same serif scale/leading and middot list paint; defined terms remain `<strong>`; every legal run-in has a literal intervening space; the malformed Stripe/PayPal `href` remains byte-for-byte unchanged.
  - `/404`: exact heading `404 - Page not found.`, exact sentence `We couldn't find the page you were looking for.`, left-aligned order heading → sentence → two guidance items → `Home Page` button; list type matches surrounding prose.
  - `/about-ehf`: purple gradient/mountain/reversed-type hero exists; H1 and sections are left aligned; `Our story`, `The Global Impact Visa`, and `Our Values` are display-scale white headings above regular body; desktop About nav has the active underline while non-About pages do not.
  - `/summer-edition-2025`: every image fits within the mobile content column; exactly 22 images have immediately following credits; the first fellow name appears once and strong; the desktop stories form image-left/text-right two-column units; paragraph/list/link structure, source macrons, image gaps, and inline underlined links are present.
  - Shared footer: the Ticket 8-accepted source-like footer contains no desktop-only newsletter control on this family.

  Run:
  ```bash
  npx playwright test tests/e2e/routes.spec.ts tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts --grep "Ticket 9|rich semantics|About active|Summer|404|legal"
  ```
  Expected: FAIL for all named findings: list fallback, missing hero, Summer structure/media failures, legal emphasis/space/scale, 404 copy/order/alignment, newsletter, and active state.

- [ ] **Step 3: Implement a lossless structured rich-text path.**

  In `src/lib/rich-text.ts`, retain `RichTextNode`, `parseInline()`, `inlineText()`, and safe `renderInlineHtml()`. Add the exported `parseRichTextBlocks()` parser and a `RichTextBlock` shape that can represent a grouped list rather than one `<ul>` per item. In `RichTextBlock.astro`, render paragraphs, headings, and grouped `ul`/`ol` structures without `white-space: pre-line` as a substitute for document structure. Never concatenate adjacent raw text nodes across a parsed inline boundary; the run-in space is content, not CSS.

  In `page-data.ts`, replace `summerLinkCounts`/`summerMediaCounts` plus `supplementalSummerImages` coupling with validated explicit Summer section records containing `body`, `media: readonly { assetId: string; alt: string; credit: string }[]`, and `links`. The loader must consume every declared link and media item exactly once and reject an overrun/underrun. Keep `PageSection` callers typed and retain the existing manifest/template mismatch rejection.

- [ ] **Step 4: Rebuild the three page templates from those typed blocks without changing route scope.**

  In `StandardPage.astro`, render a distinct Summer Edition story component inside the existing institutional template: desktop grid with the image/media column first and prose column second; mobile one-column content-width media; each `ResponsiveImage` uses `width: 510`, `height: 340`, `sizes="(max-width: 767px) calc(100vw - 48px), 510px"`, followed by its source credit; links remain inline in the prose flow. Render the exact source Summer body from the corrected JSON: one named opening sentence, source macrons, paragraphs, bold names, list rows, and links in their source positions. Preserve the recorded malformed `https://www.nztcc.org/commitee/` source href unchanged.

  Give `/about-ehf` a template variant driven only by its manifest-approved route: full-bleed purple gradient, local mountain artwork already declared in the asset manifest, reversed white display headings, source-sized regular copy, and desktop/mobile responsive geometry. Do not use a generic visual treatment for every institutional page.

  In `LegalPage.astro` and `layout.css`, apply source-sized legal H1/body/section-label scale, left alignment, serif prose/list inheritance, matching line-height, middot markers, and source emphasis. Retain all supplied legal `href` values unchanged; `target="_blank" rel="noopener noreferrer"` remains only the safe external behavior.

  In `404.astro`, replace the current copy and centered order with the exact source content/order/left alignment. Keep this as the sole intentional not-found page and retain the existing `data-page-template="not-found"` hook.

- [ ] **Step 5: Add the minimal About active-nav state and remove the non-source newsletter treatment.**


  Thread an optional `activeNav?: 'About' | 'Impact' | 'Archive'` prop through `SiteLayout.astro`, `Header.astro`, and `DesktopNav.astro`; use it only for `/about-ehf` in `[...page].astro`. The active desktop nav item receives the source underline while every other route remains unmarked. Also thread `showNewsletter?: boolean` from `SiteLayout` to `Footer`; default it to `true` so Ticket 8 Annual Report parity and non-Ticket-9 routes do not change, and pass `false` only from the Ticket 9 catch-all and `404.astro`. `Footer` renders `NewsletterForm` only when `!minimal && showNewsletter`. Do not alter menu opening, routes, submenu content, the already accepted Ticket 8 submenu surface, or form behavior. Preserve the sanctioned directory omission and use the updated Ticket 8 footer navigation unchanged.

- [ ] **Step 6: Prove Ticket 9 GREEN and create its sole correction commit.**

  Run:
  ```bash
  npm run test:unit -- tests/unit/rich-text.test.ts tests/unit/page-data.test.ts
  npx playwright test tests/e2e/routes.spec.ts tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts --grep "Ticket 9|rich semantics|About active|Summer|404|legal"
  ```
  Expected: PASS; structured rich text and media validation, legal literal `href` preservation, Summer source structure/credits/media geometry, About hero/active state, 404 exact content/order, and no-family-newsletter assertions all pass.

  Commit only the Task 2 source/content/test files:
  ```bash
  git add src/lib/rich-text.ts src/components/RichTextBlock.astro src/lib/page-data.ts src/components/StandardPage.astro src/components/LegalPage.astro src/components/Footer.astro src/pages/[...page].astro src/pages/404.astro src/layouts/SiteLayout.astro src/components/Header.astro src/components/DesktopNav.astro src/styles/layout.css src/content/pages/institutional/summer-edition-2025.json tests/unit/rich-text.test.ts tests/unit/page-data.test.ts tests/e2e/routes.spec.ts tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts
  git commit -m "fix: remediate EHF institutional visual blockers"
  ```
  Expected: one Ticket 9 correction commit; no route/content/asset manifest reclassification and no Ticket 8/10 bundle file staged.

- [ ] **Step 7: Regenerate the complete Ticket 9 packet and repair its digest contract.**

  From the Task 2 commit and accepted Ticket 8 shell, run the existing 14-state matrix: `/about-ehf` default and nav-about-open at 1440×1000 and 390×844; `/privacy-policy` default and nav-about-open at both viewports; `/summer-edition-2025` default at both; `/404` default and nav-about-open at both. Capture each state and a byte-identical independent repeat, preserve 29 immutable source files, recreate all 70 contiguous full-page segments, full/top pairs, contact sheet, health, reproducibility, source-immutability, visual matrix, and review status under `/tmp/ehf-ticket9-institutional-legal-bundle`.

  Run:
  ```bash
  npx playwright test tests/e2e/visual.spec.ts --grep "Ticket 9 institutional, legal, Summer, and 404 matrix stays responsive and locally healthy|Ticket 9 preserves rich semantics"
  ```
  Expected: both projects pass with 14 state records and no console/request/image failures.

  Recompute `bundle-manifest.json` from the final tree only after every JSON rewrite. Its declared sorted newline-delimited `sha256␠␠relative-path` algorithm must reproduce `contentTreeSha256`, its declared `entryCount` must equal the number of hashed files plus the manifest itself, and the independent integrity check must report 29/29 immutable source files, 28/28 local/repeat files, and 70/70 contiguous segments. This closes the stale top-level digest; it does not mutate source evidence.

- [ ] **Step 8: Run exactly one fresh Ticket 9 Opus recheck and apply the hard gate.**

  Give `anthropic/claude-opus-5` only the regenerated Ticket 9 core JSON, full/top pair contact sheets, all fourteen full pairs, all fourteen top pairs, and raw source/local files only as necessary. Require explicit classification of FIND-01 through FIND-08; the missing About hero/heading/body state; Summer credits/emphasis/paragraphs/lists/two-column/macrons/inline-links state; legal scale/emphasis/run-ins; 404 exact copy/order; newsletter removal; active About underline; the manifest digest; and both sanctioned exclusion/source-defect dispositions.

  **Acceptance:** P0/P1/P2 = `0/0/0`, reproducible manifest digest, exact legal href preservation, no restored excluded/stale route, no Ticket 8 submenu regression, and all Task 2 commands green. Release the Ticket 9 lease only then.

  **Stop:** any P0/P1/P2, provider error, digest mismatch, source/segment/repeat mismatch, changed malformed source href, restored excluded/dead destination, or failed focused command. Return the Ticket 9 blocker to the owner; do not begin Ticket 10 or make another Ticket 9 correction.

### Task 3: Ticket 10 — restore form typography, measure, and checkbox hanging indent

**Prerequisite:** Ticket 9 is ACCEPTED under Task 2. Capture this Ticket 10 bundle from the accepted Ticket 8/9 shared shell.

**Files:**
- Modify: `src/components/DisplayOnlyForm.astro`
- Modify: `tests/e2e/forms.spec.ts`
- Modify: `tests/e2e/visual.spec.ts`
- Evidence only: `/tmp/ehf-ticket10-contact-forms-bundle/**`

- [ ] **Step 1: Write RED form typography and behavior-preservation assertions.**

  Extend the Ticket 10 visual/form test blocks across all nine wrappers and both desktop/mobile states. Assert the common H1 has zero extra letter spacing and preserves source line counts for `/donation-outside-nz-and-us`, `/ehf-friendly-sharks-waiting-list`, and `/news-and-events-updates`; labels, legends, checkbox labels, and field values share the regular body serif; `(required)` is the source-sized qualifier; intro and privacy copy use source body scale/leading; donation intro copy has the wide desktop source measure; and updates checkboxes have an 11px control-to-label gap with wrapped text aligned beneath the label, not the checkbox.

  Keep and explicitly run the existing display-only contract: submitted values persist, no request follows submit, no success state appears, no action attribute exists, the source honeypot/reCAPTCHA remains absent, and `/donate`/payment/video/social controls remain absent.

  Run:
  ```bash
  npx playwright test tests/e2e/forms.spec.ts tests/e2e/visual.spec.ts --grep "Ticket 10|display-only|form"
  ```
  Expected: FAIL on heading tracking/wrap, serif label/qualifier hierarchy, intro scale/measure, and checkbox hanging indent while existing no-send/value-retention checks continue to pass.

- [ ] **Step 2: Make the minimal common `DisplayOnlyForm` correction.**

  In `DisplayOnlyForm.astro`, retain the exported `DisplayOnlyField` union, route wrapper props, native controls, IDs, labels, `data-display-only-form`, and the `submit` event’s `preventDefault()` handler. Change only component-local styles: remove H1 letter spacing; apply the source regular body serif and regular weight to `form`, `legend`, labels, and checkbox labels; size the required qualifier relative to that serif label rather than as a smaller sans token; set intro/privacy copy to the source body size and 33–35px desktop-leading equivalent; allow desktop donation intro paragraphs to use the route-wide source measure while retaining the form’s 918px control column; and set checkbox grid columns/gap/padding so 18px checkbox controls have an 11px gap and a true hanging indent.

  Do not change heading text, route props, `HeadingVariant`, `FormLayout`, form fields, button/no-send behavior, footer, shared typography tokens, checkbox checked state, or R2’s now-uniform desktop heading size.

- [ ] **Step 3: Prove Ticket 10 GREEN and create its sole correction commit.**

  Run:
  ```bash
  npx playwright test tests/e2e/forms.spec.ts tests/e2e/visual.spec.ts --grep "Ticket 10|display-only|form"
  ```
  Expected: PASS; all nine forms retain exact labels/fields/button text and display-only behavior, heading wraps match the source cases, source serif label hierarchy/qualifier scale holds, intro measure/leading holds, and checkbox labels retain the source 11px hanging indent.

  Commit only the Task 3 files:
  ```bash
  git add src/components/DisplayOnlyForm.astro tests/e2e/forms.spec.ts tests/e2e/visual.spec.ts
  git commit -m "fix: remediate EHF form visual blockers"
  ```
  Expected: one Ticket 10 correction commit; no wrapper, source-contract, data, shared-style, footer, or navigation file staged.

- [ ] **Step 4: Regenerate the complete Ticket 10 packet exactly once.**

  From the Task 3 commit and the accepted shared shell, regenerate the current 18-state matrix: the nine manifest-included form routes at 1440×1000 and 390×844, using the source-recorded sample values for local filled captures. Capture default health plus filled local/repeat comparisons, copy all 36 immutable source PNG/JSON inputs, recreate full/top pairs, all eighteen metrics, contact sheet, health, source-immutability, visual matrix, and review status under `/tmp/ehf-ticket10-contact-forms-bundle`.

  Run:
  ```bash
  npx playwright test tests/e2e/forms.spec.ts tests/e2e/visual.spec.ts --grep "Ticket 10 form source matrix has eighteen immutable captures and healthy default-filled local states|Ticket 10|display-only"
  ```
  Expected: all form source/default/filled state assertions pass; 18/18 local/repeat captures are byte-identical; every route records no console error, failed request, source-host reference, request after submit, or success state.

  Document the bundle manifest’s sorted newline-delimited `sha256␠␠relative-path` tree serialization and verify it against the final content tree. Record the sanctioned Fellow Directory omission and the deliberately unjudged source/local checkbox checked-state capture protocol difference; neither may be relabeled a product defect.

- [ ] **Step 5: Run exactly one fresh Ticket 10 Opus recheck and apply the hard gate.**

  Give `anthropic/claude-opus-5` only `bundle-manifest.json`, `visual-matrix.json`, `health.json`, `source-immutability.json`, `review-status.json`, contact sheet, all eighteen metrics, and all eighteen full/top comparisons. Require explicit classification of R1/R3 and F1–F5, confirmation that R2 remains resolved, and confirmation that display-only behavior is intentionally outside visual classification.

  **Acceptance:** P0/P1/P2 = `0/0/0`; 150-or-more final bundle inventory entries hash correctly; 36/36 source copies remain immutable; 18/18 repeats match; all no-send/no-success/value-retention fields hold; and Task 3’s focused commands pass. Release the Ticket 10 lease only then.

  **Stop:** any P0/P1/P2, provider error, failed integrity/no-send/repeat check, shared-shell regression, or failed focused command. Return the Ticket 10 blocker to the owner; do not make another correction, begin Ticket 11, merge, deploy, or alter production.

### Task 4: Sequential release to existing Tickets 11 and 12

**Files:** No new remediation-plan files. Follow the detailed Tasks 11–12 in `docs/superpowers/plans/2026-08-09-ehf-stage-2.md:392-431` exactly.

- [ ] **Step 1: Gate Ticket 11.** Start only after the three Task 1–3 fresh reviews are each ACCEPTED with P0/P1/P2 = `0/0/0`, all three compact-bundle digest/integrity records reproduce, and all three leases are released. Execute the existing Ticket 11 integrity/accessibility steps unchanged; it remains the sole owner of its verifier, full cross-family route/link/asset/accessibility work, and its accepted commit.

- [ ] **Step 2: Gate Ticket 12.** Start only from the accepted, green Ticket 11 commit. Execute the existing Ticket 12 visual-matrix, clean-install, handoff, and one final review protocol unchanged. This remediation plan grants no second full-suite run, clean-install, merge, push, preview, or production action before those existing gates authorize it.

## Self-review record

- **Blocker coverage:** Ticket 8 maps all six programme P2s plus the two required shared submenu states; it preserves resolved VD8-001/005/012 and Annual Report parity. Ticket 9 maps FIND-01–08 plus the observed About hero/hierarchy/active state, Summer structure/media/credits/macrons/link/desktop layout defects, newsletter, and stale digest. Ticket 10 maps R1/R3 and F1–F5 while preserving R2 and display-only behavior.
- **Exclusions:** Fellow Directory, all directory variants, EHF Fellows Articles, Hillary Institute, stale/dead destinations, malformed source paths, and legal source href defects are expressly preserved/dispositioned rather than restored.
- **Type/signature consistency:** `parseRichTextBlocks()`, grouped rich-text blocks, explicit Summer section media, `activeNav`, `DisplayOnlyField`, and `captureComparable()` are named once and consumed consistently. No new route or manifest classification is introduced.
- **Ownership:** Ticket 8 lands the shared Impact submenu/surface first; Ticket 9 consumes it and limits its shared change to About active state; Ticket 10 is component-local. Downstream bundle regeneration follows each accepted shared change.
- **Protocol:** Every ticket has RED, minimal correction, GREEN, one correction commit, complete immutable/repeatable bundle regeneration, exactly one fresh Opus recheck, and an owner stop rule. Tickets 11–12 retain their existing detailed plan and hard prerequisites.
- **Scope:** This plan contains no implementation action, validation result, evidence mutation, package change, route expansion, merge, deployment, preview, or production promotion.


## Ticket 8 execution and blocker record — 2026-08-11

- **Execution evidence:** Correction commit `6c2b327` recorded the focused RED result as 5 failed and 1 skipped, then the final GREEN result as 7 passed and 1 skipped. The spec re-review approved the exact-eight programme-break correction and the Impact-only/base submenu correction. The quality review approved the correction with one Minor: no assertion for `right: 0`.
- **Packet and terminal review:** `/tmp/ehf-ticket8-events-reports-bundle` inventories 75 files with content-tree SHA-256 `ef18d06c1c78ca9b255e2c7749f59092c095a27000f984c26f811dd41ae53db6`. The fresh Opus artifact `agent://VisualDesignerTicket8RemediationFinal` returned `BLOCKED` with P0/P1/P2/P3 counts `0/1/9/2`.
- **Provenance failure:** `history://BuildLeadTicket8Evidence` shows that, after the focused test, the packet assembler copied every `local/` and `repeat/` PNG and JSON sidecar from the pre-correction `old_root`, using:

  ```python
  for sub in ('local','repeat'):
      for ext in ('png','json'):
          data=(old_root/sub/f'{sid}.{ext}').read_bytes()
          (stage/sub/f'{sid}.{ext}').write_bytes(data)
  ```

  The focused test's capture helper returns PNG bytes in memory and does not persist them. The packet therefore labels stale bytes as commit `6c2b327`, so its visual defect counts are not a trustworthy judgment of the current code. The contradiction is direct: GREEN computed styles show a 111px time column, eight `#eee` breaks, `#ccc` enclosure, and 115px/left-aligned mobile tabs; the stale images show a 189px column, one grey break, no enclosure, and approximately 55px centered tabs.
- **Plan defects requiring owner decision:** The packet sanctions omitted Impact Snapshots even though its stale/dead-route disposition was accepted earlier. Also, the About submenu surface and shared newsletter are visible in Ticket 8 states but deferred to Ticket 9. That makes serial Ticket 8 acceptance with zero P2 findings impossible under the current plan. The owner must authorize a plan revision; this record does not assign the new ownership.
- **Hard stop:** Ticket 8 is not accepted. A replacement capture or review is not authorized. Ticket 9, Tickets 11–12, push, merge, preview, deploy, and production have not started and are not authorized. Local commits have not been pushed; the remote remains `427ceb2`.

## Owner-authorized Ticket 8 evidence recovery addendum — 2026-08-11

> **Authority and scope:** This addendum is the owner-authorized recovery from the stale-packet provenance failure. It supersedes only the conflicting Ticket 8 portions of Task 1 (especially Steps 1–6), the Ticket 8 starting/gating statements above, and the Ticket 9 newsletter-ownership wording to the extent those statements defer the two Ticket 8 route exclusions. It does not delete or revise the historical execution/blocker record above: `agent://VisualDesignerTicket8RemediationFinal`, its `0/1/9/2` classification, and the old packet remain diagnostic evidence only, because their local/repeat bytes came from the old bundle rather than the correction commit.

### A. Recovery baseline, ownership resolution, and exact files

- **Starting check:** the manager’s execution authorization must export `TICKET8_RECOVERY_PLAN_COMMIT` as the exact current recovery-plan commit SHA. Before editing, run:

  ```bash
  : "${TICKET8_RECOVERY_PLAN_COMMIT:?manager must supply the exact current recovery-plan commit}" &&
  test "$(git branch --show-current)" = "feature/ehf-stage-2-implementation" &&
  test "$(git rev-parse HEAD)" = "$TICKET8_RECOVERY_PLAN_COMMIT" &&
  test -z "$(git status --porcelain)" &&
  git merge-base --is-ancestor 5949938ee5ee6306032d4d06df61f04cb80e6bcc HEAD &&
  git merge-base --is-ancestor 6c2b32727246a9d4fdec40ef49575e9ca49ca461 HEAD
  ```

  BuildLead must be exactly `openai-codex/gpt-5.6-terra`. Stop and return the differing value before editing if any check fails.
- **Baseline:** retain correction commit `6c2b32727246a9d4fdec40ef49575e9ca49ca461` as the accepted programme-geometry baseline. Do not reimplement its 111px programme column, eight `#eee` break rows, `#ccc` enclosure, wrapped time ranges, 115px left-aligned mobile tabs, track/speaker markup, or Annual Report document grid.
- **First-owner correction:** Ticket 8 now owns the only shared-shell work visible in its eight states: the desktop About and Impact submenus must both be transparent, square, unshadowed, and right-aligned; `/2025-summit-programme` and `/23-annual-report` must not render the newsletter. The latter is a route-level `showNewsletter={false}` decision, not a global footer removal. The default remains `true` for every other caller, including the homepage and the later Ticket 9 family.
- **Sanctioned omission:** `Impact Snapshots` is a stale/dead omitted destination accepted by removal commit `f9f0b202` and final amendment `63d7784`. Record it beside `EHF Fellows Articles` and the Fellow Directory variants in the replacement packet’s `sanctionedNavigation`; do not restore it, add it to `primaryNavigation`, add a route, or classify its absence as a defect.
- **Ticket 9 resolution:** Ticket 9 must consume this accepted shared shell and must not re-add the newsletter on the two Ticket 8 routes. Its later footer decision remains limited to its own listed catch-all/404 family. No Ticket 9 source, test, manifest, or bundle work begins before this addendum’s replacement acceptance.

| Change kind | Exact paths | Responsibility |
| --- | --- | --- |
| Route-specific footer state | `src/components/Footer.astro`; `src/layouts/SiteLayout.astro`; `src/pages/2025-summit-programme.astro`; `src/pages/23-annual-report.astro` | Add a default-preserving `showNewsletter` prop and disable it only at the two Ticket 8 callers. |
| Shared desktop submenu paint | `src/styles/layout.css` | Apply the same source-faithful bare/right-aligned surface to both existing About and Impact desktop submenus; do not change `DesktopNav.astro` behavior or mobile styles. |
| Persistent Ticket 8 capture support | `tests/support/ticket8-capture.ts` (create); `tests/e2e/visual.spec.ts` | Persist only explicit-environment Ticket 8 local/repeat captures produced by the existing helpers. |
| Deterministic packet assembler | `scripts/assemble-ticket8-bundle.mjs` (create) | Build a new packet only from `HEAD` source blobs and the new raw capture root. |
| Focused contracts | `tests/e2e/navigation.spec.ts`; `tests/e2e/visual.spec.ts`; `tests/unit/ticket8-capture.test.ts` (create); `tests/unit/ticket8-bundle-assembler.test.ts` (create) | Protect shared shell, route exclusion, raw persistence, and assembler invariants. |

No other source, style, navigation-data, content, manifest, source-capture, package, lockfile, route, asset, or evidence file is in this recovery commit. In particular, do not modify `src/components/DesktopNav.astro`, `src/data/site.ts`, `src/components/EventProgrammePage.astro`, `source-evidence/**`, or the old `/tmp/ehf-ticket8-events-reports-bundle` as an assembler input.

### B. RED contracts before recovery implementation

- [ ] **Step 1: Add the shared-shell RED assertions in the existing focused browser suites.**

  In `tests/e2e/navigation.spec.ts`, replace the Impact-only surface expectation in `Impact folder exposes only approved destinations on a bare right-aligned submenu` with a table over `About` and `Impact`. Hover each `[data-nav-item]` trigger and assert its `[data-desktop-submenu]` is visible with:

  ```ts
  {
    backgroundColor: 'rgba(0, 0, 0, 0)',
    borderRadius: '0px',
    boxShadow: 'none',
    right: '0px',
    textAlign: 'right'
  }
  ```

  Retain the Impact child order assertion, then additionally assert that no Impact submenu link is named `Impact Snapshots`, `EHF Fellows Articles`, or `Fellow Directory`.

  In the Ticket 8 matrix test in `tests/e2e/visual.spec.ts`, after each route capture, navigate to the route and assert `page.locator('[data-newsletter-form]')` has count `0`. Add a homepage control assertion that the same locator has count `1`, so a global footer removal fails. Retain every existing programme and Annual Report assertion.

  Run:

  ```bash
  npx playwright test tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts --grep "Impact folder|Ticket 8 representative event and report matrix"
  ```

  Expected: FAIL because About retains the white, padded, shadowed surface with `right: -16px`, and both Ticket 8 routes still render the newsletter; all retained programme geometry and Annual Report assertions remain green.

- [ ] **Step 2: Add RED persistence and assembler invariant tests.**

  Create `tests/unit/ticket8-capture.test.ts`. Use a temporary directory and a fixed `ComparableCapture` fixture whose `screenshotEvidence.bytes` is a non-empty `Buffer`. Specify that `createTicket8CaptureWriter(root, commit)` rejects an existing root, creates only `local/` and `repeat/`, and that `writePair()` writes the exact local/repeat PNG buffers plus byte-identical, newline-terminated sidecars. Assert each sidecar has exactly the deterministic fields `schemaVersion`, `commit`, `id`, `route`, `state`, `viewport`, `screenshot`, `browserHealth`, `scroll`, and `navigation`; its `commit`, route/state/viewport, and screenshot SHA-256 must bind the fixture. Assert no writer is constructed when `TICKET8_CAPTURE_ROOT` is absent from the matrix path.

  Create `tests/unit/ticket8-bundle-assembler.test.ts`. Build an eight-state temporary raw fixture from the committed Ticket 8 source PNG bytes and valid deterministic sidecars, then execute `node scripts/assemble-ticket8-bundle.mjs --raw-root <fixture> --output <new-output>`. Assert a successful output has eight `metrics/*.json`, sixteen `normalized/*-{source,local}.png`, eight each of `source/*.png`, `local/*.png`, and `repeat/*.png`, `contact-sheet.png`, `health.json`, `review-status.json`, and `bundle-manifest.json`; re-hash its recorded sorted serialization and require the recorded tree digest to match. In separate fixtures, require a nonzero exit and no output reuse for: an existing output directory; missing expected raw file; an unrecognised extra raw file; sidecar commit not equal to `git rev-parse HEAD`; sidecar/image SHA mismatch; local/repeat PNG mismatch; local/repeat sidecar mismatch; route/state/viewport mismatch; and a source path absent from the committed Ticket 8 capture map. The fixture must never use `/tmp/ehf-ticket8-events-reports-bundle`.

  Run:

  ```bash
  npm run test:unit -- tests/unit/ticket8-capture.test.ts tests/unit/ticket8-bundle-assembler.test.ts
  ```

  Expected: FAIL because neither the capture writer nor the assembler exists. The failing assertions must be missing-function/module failures, not fixture or TypeScript errors.

### C. Minimal GREEN implementation

- [ ] **Step 3: Make only the Ticket 8 shell correction.**

  In `src/components/Footer.astro`, change the props interface to:

  ```ts
  interface Props {
    minimal?: boolean;
    showNewsletter?: boolean;
  }
  ```

  Destructure `showNewsletter = true`, and render the form only when `!minimal && showNewsletter`. In `src/layouts/SiteLayout.astro`, add `showNewsletter?: boolean` to `Props`, destructure it as `true`, and pass `<Footer minimal={minimalFooter} showNewsletter={showNewsletter} />`. Set `<SiteLayout ... showNewsletter={false}>` only in `src/pages/2025-summit-programme.astro` and `src/pages/23-annual-report.astro`.

  In `src/styles/layout.css`, make the existing `.desktop-nav__submenu` rule itself use `right: 0`, `width: auto`, `padding: 0`, `border-radius: 0`, `background: transparent`, and `box-shadow: none`; retain its positioning, top margin, list display, item pitch, links, focus behavior, and mobile rules. Remove the now-redundant Impact-only override rather than maintaining a second surface rule.

- [ ] **Step 4: Add the explicit, deterministic raw-capture writer.**

  Create `tests/support/ticket8-capture.ts` with these exported types and functions:

  ```ts
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
    writePair(
      id: Ticket8CaptureId,
      route: string,
      state: ComparableState,
      viewport: { width: number; height: number },
      local: ComparableCapture,
      repeat: ComparableCapture
    ): void;
    finalize(): void;
  }

  export function createTicket8CaptureWriter(root: string, commit: string): Ticket8CaptureWriter;
  ```

  `createTicket8CaptureWriter()` must require an absolute, non-existent root and create it with only `local/` and `repeat/` children. `Ticket8CaptureWriter.writePair(id, route, state, viewport, local, repeat)` must write `local/<id>.png`, `local/<id>.json`, `repeat/<id>.png`, and `repeat/<id>.json` from the passed `ComparableCapture` objects. PNG bytes are exactly `capture.screenshotEvidence.bytes`; never call `page.screenshot()` again and never use an old root. Serialize the identical sidecar object with `JSON.stringify(object, null, 2) + '\n'`; it contains `schemaVersion: 1`, the current commit, the exact ID/route/state/viewport, screenshot byte/decoded hashes and dimensions/capture metadata, browser health arrays, scroll positions/return-to-top, and navigation state flags. `finalize()` must reject any ID set other than the eight IDs above.

  In `tests/e2e/visual.spec.ts`, export `captureIndependentPair()` with its current signature:

  ```ts
  export async function captureIndependentPair(
    page: Page,
    route: string,
    viewport: { width: number; height: number },
    state: ComparableState
  ): Promise<[ComparableCapture, ComparableCapture]>;
  ```

  In the existing Ticket 8 matrix, read `TICKET8_CAPTURE_ROOT` once. When it is undefined, retain the current single `captureComparable()` path and create no root, directory, raw PNG, raw JSON, or bundle artifact. When it is set, obtain the current commit with `git rev-parse HEAD`, construct the writer before the loop, call `captureIndependentPair()` for every one of the exact eight route/state/viewport entries, send the returned actual captures to `writePair()`, and call `finalize()` after the loop. Continue all current health and mobile-state assertions against the local member of the pair. This is the only code path that produces persistent Ticket 8 raw evidence.

- [ ] **Step 5: Implement the checked-in assembler with no fallback input.**

  Create `scripts/assemble-ticket8-bundle.mjs` with only Node built-ins, `sharp` already installed for the existing visual suite, and Git. It has exactly two modes:

  ```bash
  node scripts/assemble-ticket8-bundle.mjs --raw-root <absolute-raw-root> --output /tmp/ehf-ticket8-events-reports-bundle
  node scripts/assemble-ticket8-bundle.mjs --verify --raw-root <absolute-raw-root> --output /tmp/ehf-ticket8-events-reports-bundle
  ```

  It must resolve `HEAD` once using `git rev-parse HEAD`; load the two Ticket 8 template capture maps from `git show HEAD:source-evidence/source-contract.json`; and obtain every source PNG/JSON with `git show HEAD:<declared-path>`, not the working tree. Its expected raw names are exactly the eight `Ticket8CaptureId` values above, each with `local` and `repeat` `.png` and `.json`, so the input tree has exactly 32 regular files. Before creating output, reject an existing output path, non-absolute/missing raw root, a symlink/non-file, missing or extra raw input, invalid JSON/schema, any wrong sidecar commit, a route/state/viewport not matching the capture map, any PNG SHA-256 not matching its sidecar, or any local/repeat PNG or sidecar byte mismatch. Do not read, copy, rename, glob, or otherwise consume the old packet path.

  After every validation succeeds, create the previously absent output and write only:

  ```text
  source/<id>.png                 source/<id>.json
  local/<id>.png                  local/<id>.json
  repeat/<id>.png                 repeat/<id>.json
  normalized/<id>-source.png      normalized/<id>-local.png
  metrics/<id>.json
  contact-sheet.png
  health.json
  review-status.json
  bundle-manifest.json
  ```

  Copy source bytes from `git show` and local/repeat bytes from the validated raw tree. Generate normalized source/local PNGs and the contact sheet with `sharp`; each metric must state the exact ID, source/local byte and decoded hashes, dimensions, and the normalization canvas. `health.json` must report all eight local/repeat health arrays, local `/assets/` image paths, state flags, and zero source-host references. `review-status.json` must set `status` to `pending-replacement-opus`, identify `agent://VisualDesignerTicket8RemediationFinal` as `diagnostic-stale-local-repeat-bytes`, retain Annual Report parity and resolved `VD8-001`/`VD8-005`/`VD8-012`, and list `Impact Snapshots`, `EHF Fellows Articles`, and all four Fellow Directory paths as sanctioned omissions.

  Hash every output file except `bundle-manifest.json`, sort paths in bytewise ascending relative-path order, and form the exact serialization `entries.map(({ sha256, path }) => \`${sha256}  ${path}\`).join('\n') + '\n'`. Put that actual serialization, its SHA-256 as `contentTreeSha256`, the sorted `{ path, byteLength, sha256 }` inventory, `entryCount: inventory.length + 1`, and the resolved commit in `bundle-manifest.json`. This produces a reproducible digest from the final output content without self-hashing the manifest.

  In build mode, the output path must not exist. In `--verify` mode, it must exist and the script must write nothing: revalidate the raw tree and then re-hash every manifest inventory entry, recompute the recorded serialization/digest and entry count, compare all local/repeat PNG and sidecar pairs byte-for-byte, check every sidecar commit against `HEAD`, and compare every bundled source byte to `git show HEAD:<declared-path>`. Return zero only for that complete verification; otherwise return nonzero with the named invariant.

- [ ] **Step 6: Prove focused GREEN, commit, then complete read-only reviews before capture.**

  Run:

  ```bash
  npm run test:unit -- tests/unit/ticket8-capture.test.ts tests/unit/ticket8-bundle-assembler.test.ts
  npx playwright test tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts --grep "Impact folder|Ticket 8 representative event and report matrix"
  ```

  Expected: PASS. The unit tests prove output refusal, byte/sidecar identity, commit binding, source-blob-only assembly, sorted digest reproduction, and stale/extra input rejection. The browser tests prove both submenu surfaces and `right: 0`, Ticket 8 newsletter absence, homepage newsletter preservation, all Ticket 8 geometry, route exclusions, keyboard/menu behavior, and Annual Report parity.

  Make the only recovery implementation commit:

  ```bash
  git add src/components/Footer.astro src/layouts/SiteLayout.astro src/pages/2025-summit-programme.astro src/pages/23-annual-report.astro src/styles/layout.css tests/support/ticket8-capture.ts tests/e2e/navigation.spec.ts tests/e2e/visual.spec.ts tests/unit/ticket8-capture.test.ts tests/unit/ticket8-bundle-assembler.test.ts scripts/assemble-ticket8-bundle.mjs
  git commit -m "fix: repair Ticket 8 evidence provenance"
  ```

  The commit must contain exactly those paths; no packet, source capture, plan, manifest, package, lockfile, or review artifact is committed.

  Obtain a read-only specification review of the baseline-to-commit diff, then a read-only quality review of that same committed diff. Both must confirm the narrow file map, no reimplementation of `6c2b327`, default newsletter preservation, exact raw/bundle safety contracts, accessibility/menu preservation, and no old-packet input. If either review finds an in-scope defect, the same implementer must correct it, rerun the two focused GREEN commands, and amend this sole recovery commit with `git commit --amend --no-edit`. Repeat the specification review and then the quality review against the amended baseline-to-commit diff; both must approve before Step 7. Do not create another recovery implementation commit, capture, or review packet before both approvals.

### D. One truthful packet, independent verification, and one replacement review

- [ ] **Step 7: Generate the one replacement packet after the approved recovery commit.**

  Preserve the old diagnostic packet without using it as input, then require fresh raw and output paths:

  ```bash
  RECOVERY_SHA="$(git rev-parse HEAD)" &&
  RAW_ROOT="/tmp/ehf-ticket8-raw-capture-${RECOVERY_SHA}" &&
  OLD_PACKET="/tmp/ehf-ticket8-events-reports-bundle-invalid-stale-6c2b327" &&
  OUTPUT="/tmp/ehf-ticket8-events-reports-bundle" &&
  test ! -e "$RAW_ROOT" &&
  if test -e "$OUTPUT"; then test ! -e "$OLD_PACKET" && mv "$OUTPUT" "$OLD_PACKET"; fi &&
  test ! -e "$OUTPUT" &&
  TICKET8_CAPTURE_ROOT="$RAW_ROOT" npx playwright test tests/e2e/visual.spec.ts --grep "Ticket 8 representative event and report matrix" &&
  node scripts/assemble-ticket8-bundle.mjs --raw-root "$RAW_ROOT" --output "$OUTPUT"
  ```

  Expected: one fresh 32-file raw input rooted at the committed recovery SHA, one fresh output packet, eight actual local/repeat pairs from independent pages, and no source-host/network/image/console-health failure. This command must not delete, overwrite, or inspect the preserved diagnostic packet.

- [ ] **Step 8: Perform manager packet verification before visual review.**

  Independently run the assembler’s read-only verification mode:

  ```bash
  node scripts/assemble-ticket8-bundle.mjs --verify --raw-root "$RAW_ROOT" --output "$OUTPUT"
  ```

  Expected: PASS without modifying `"$RAW_ROOT"` or `"$OUTPUT"`. This re-hashes every manifest inventory entry, recomputes `contentTreeSha256` from the recorded serialization, confirms `entryCount`, confirms all eight local/repeat PNG and sidecar pairs are byte-identical, confirms every sidecar commit equals `RECOVERY_SHA`, and confirms source bytes equal `git show "$RECOVERY_SHA:<path>"` for every declared source capture. The manager must record PASS only if this command succeeds. A missing file, hash mismatch, wrong commit, source mismatch, repeated-output attempt, or failed focused command stops Ticket 8 and returns the exact failure to the owner.

- [ ] **Step 9: Spend exactly one replacement Opus judgment.**

  Dispatch `anthropic/claude-opus-5` once, read-only, with only the new `/tmp/ehf-ticket8-events-reports-bundle` packet: `bundle-manifest.json`, `health.json`, `review-status.json`, `contact-sheet.png`, all eight `metrics/*.json`, all sixteen `normalized/*-{source,local}.png`, and the eight source/local raw PNG pairs only if a suspected defect needs adjudication. It must not read the preserved old packet, raw repeat files, repository, browser, source host, history, or execute commands.

  Require explicit classifications for all eight state pairs; both desktop About/Impact bare submenu surfaces; both route-level newsletter exclusions; programme geometry as already corrected by `6c2b327`; Annual Report parity; `Impact Snapshots`/`EHF Fellows Articles`/Fellow Directory sanctioned omissions; and P0/P1/P2/P3 totals. Its acceptance condition is exactly P0/P1/P2 = `0/0/0` with the manager packet verification PASS.

  **Terminal stop rule:** any P0/P1/P2, provider/protocol error, absent verdict, packet verification failure, or focused-command failure stops Ticket 8. Do not retry the capture, assembler, review, model route, or correction; do not start Ticket 9, 10, 11, or 12; do not push, preview, merge, deploy, change an alias/domain, or take production action. If accepted, record the replacement verdict and packet digest in the Ticket 8 private ledger and plan status, release the Ticket 8 lease, and only then permit Ticket 9 under its existing detailed plan.

### D.1 Terminal Step 7 recovery capture failure — 2026-08-11

- **Recorded attempt:** The approved recovery implementation commit is `b23af6a9a8952cdf6dec84d1d499210737fa0819`; its specification and quality reviews were approved. Exactly one Step 7 capture command was attempted and exited `1` with `1 passed` and `1 failed`. The desktop matrix timed out in `prepareComparableDocument` at `tests/e2e/visual.spec.ts:61` while awaiting `page.waitForTimeout(100)`, called from `captureComparable` at line 121 and the matrix at line 820.
- **Unproduced downstream work:** The assembler did not run. No replacement packet, manifest, digest, health record, or verdict was produced, and the replacement Opus call was not spent. This record intentionally does not claim that the command made no filesystem action: old-packet movement, raw staging, and output state were deliberately uninspected and remain unverified.
- **Terminal disposition:** Ticket 8 is not accepted. After the attempt, the repository was clean and `HEAD` remained `b23af6a9a8952cdf6dec84d1d499210737fa0819`. The terminal rule forbids retry, correction, review, and Tickets 9–12, plus push, preview, merge, and deploy, until a new explicit owner plan authorizes further work.


### E. Addendum self-review record

- **Authorization coverage:** preserves `6c2b327` programme work; moves both visible desktop submenu surfaces and the two visible newsletter exclusions to Ticket 8; preserves the homepage/default newsletter; records the `f9f0b202`/`63d7784` Impact Snapshots removal; keeps Annual Report parity, menu semantics/accessibility, accepted P3s, route exclusions, and no Stage 9/10 start before acceptance.
- **Evidence provenance:** the matrix writes the exact `captureComparable()` screenshot buffer only under explicit `TICKET8_CAPTURE_ROOT`; independent repeats come only from `captureIndependentPair()`; sidecars bind commit/route/state/viewport; normal tests create no evidence root; and the assembler cannot read the old packet or reuse output.
- **Assembler safety:** raw input is complete/exact and sidecar/hash/commit checked before output creation; committed source bytes come from `git show HEAD`; local/repeat and sidecars are byte-identical; output inventory/digest use the stated actual sorted serialization; no new dependency or package change is required.
- **TDD and review order:** focused shared-shell/persistence/assembler RED precedes minimal code; focused GREEN precedes one recovery implementation commit; read-only specification then quality review inspect that committed diff; in-scope review fixes amend that same commit, rerun focused GREEN, and require both reviewers to reapprove before the single evidence generation; manager verification precedes exactly one replacement Opus judgment.
- **No placeholders or scope expansion:** all paths, identifiers, capture IDs, prop names, helper signatures, root/output paths, commands, dispositions, failure behavior, and downstream gate are named above. This addendum changes no implementation itself and authorizes no source-host capture, push, preview, merge, deployment, or production action.