# EHF Astro Stage 1 Spike Results

## Status and decision boundary

Stage 1 evidence is complete for exactly four built static routes: `/`, `/read`, `/read/how-chemergy-is-changing-the-game-in-waste-to-energy`, and `/23-annual-report`. The only current implementation capture is the exact 11-state matrix in `source-evidence/implementation-screenshots/`: eight route/viewport defaults plus desktop Impact, desktop About, and mobile-menu states on the home page.

This report is evidence for the project owner, not authorization. No owner approval is recorded; Stage 2 remains blocked. The capture uses the built `astro preview` output, never the development server, and each adjacent JSON record has an ISO timestamp, implementation URL, positive document height, and empty `imagesNotLoaded`, `consoleErrors`, and `failedRequests` arrays.

## Definitive capture and post-report verification

The definitive built-preview capture established the final evidence set. The prescribed verification was then rerun after this report/status update; variable timing is recorded separately so the report does not overwrite the evidence-capture measurements.

| Command | Definitive evidence-capture result | Post-report rerun |
|---|---|---|
| `npm run build` | Passed: Astro check processed 29 files with 0 errors, 0 warnings, and 0 hints; static build generated 4 pages in 343 ms; 3.10 s wall time. | Passed: the same diagnostics and 4 pages; 341 ms build time and 3.10 s wall time. |
| `npm run assets:verify` | Passed: 40 manifest records and runtime asset references verified; 0.45 s wall time. | Passed: 40 manifest records and runtime asset references verified; 0.46 s wall time. |
| `npm run test:unit` | Passed: 1 file, 12 tests; 95 ms test duration and 0.36 s wall time. | Passed: 1 file, 12 tests; 96 ms duration and 0.35 s wall time. Vitest emitted its existing non-blocking native-config future warning. |
| `npm run test:e2e -- tests/e2e/spike.spec.ts tests/e2e/navigation.spec.ts tests/e2e/spike-visual.spec.ts tests/e2e/accessibility.spec.ts` | Passed: 108 defined E2E tests, 89 passed, 19 expected project-scoped skips, and 0 failures; 13.5 s test duration and 13.77 s wall time. | Passed: the same 108/89/19/0 result; 13.9 s test duration and 14.23 s wall time. The visual spec regenerated the implementation evidence. |
| Built-output smoke at `npm run preview -- --host 127.0.0.1 --port 4321` | Passed all four routes at 1440×1000 and 390×844: one main landmark per route, every local image had positive natural width, no Astro development toolbar or `@vite/client`/`@astro/client`, and 0 console errors and failed requests. Desktop Impact/About and the mobile menu were also exercised. | The refreshed E2E metadata remains clean for all 11 states; this rerun did not start a second preview smoke server. |

The complete post-report test count is 120: 12 unit tests plus 108 defined E2E tests. It produced 101 passes, 19 expected project-scoped E2E skips, and 0 failures. All 11 current metadata pairs are clean. A later requested additional evidence-audit attempt was provider-rate-limited after it confirmed the 11 metadata pairs align and are clean; it is not represented as a completed audit.

## Final visual comparison and residual disposition

Source and implementation document heights are from paired JSON metadata. Positive deltas mean the implementation is taller. The annual-report mobile delta is accepted rounding tolerance, not an unresolved visual issue.

| Severity | Route | Viewport | State | Source / implementation height | Disposition |
|---|---|---:|---|---|---|
| Resolved | `/` | 1440×1000 | default | 2048 / 2048 px, 0 | Height matches; the remaining localized explicit-line-break/reflow variance is P3-4 below. |
| Resolved | `/` | 390×844 | default | 2442 / 2442 px, 0 | Height matches. |
| P3-1 | `/read` | 1440×1000 | default | 3658 / 3600 px, −58 | Cosmetic archive desktop rhythm/height variance; card order and source-observed shortest-column behavior are covered by `tests/e2e/spike.spec.ts`. |
| P3-2 | `/read` | 390×844 | default | 9870 / 9892 px, +22 | Cosmetic archive mobile rhythm/height variance; the single-column source order is covered by `tests/e2e/spike.spec.ts`. |
| P3-3 | article | 1440×1000 | default | 6605 / 6643 px, +38 | One article font-metric/content-flow cluster, shared with the mobile row; it is not counted twice. |
| P3-3 | article | 390×844 | default | 10986 / 11442 px, +456 | The same font-metric/content-flow cluster. The route is responsive, locally complete, and has no horizontal overflow under `tests/e2e/spike.spec.ts`. |
| Resolved | `/23-annual-report` | 1440×1000 | default | 1406 / 1406 px, 0 | Height matches. |
| Resolved | `/23-annual-report` | 390×844 | default | 1520 / 1519 px, −1 | Accepted sub-pixel/rounding tolerance. |
| Resolved | `/` | 1440×1000 | Impact menu open | 2048 / 2048 px, 0 | Built-preview capture is toolbar-free, keyboard-tested, and error-free. |
| Resolved | `/` | 1440×1000 | About menu open | 2048 / 2048 px, 0 | Built-preview capture is toolbar-free, keyboard-tested, and error-free. |
| Resolved | `/` | 390×844 | mobile menu open | 2442 / 2442 px, 0 | Modal state is focus-trapped, scroll-locked, and error-free. |

**Severity count:** P0 0, P1 0, P2 0, P3 5. The five non-overlapping P3 dispositions are: (1) archive desktop rhythm, (2) archive mobile rhythm, (3) the article desktop/mobile font-metric cluster, (4) home localized explicit-line-break/reflow variance despite matching document heights, and (5) the About disclosure-row nav-font metric. P3-5 is a 2.47 px leftward caret position caused by the implementation’s 85.03 px “About” label versus the source’s 90 px label; the caret geometry itself matches. The annual-report mobile −1 px delta is accepted tolerance and is excluded from P3.

## Final-audit defects resolved

The layered implementation and visual audits closed the following defects before the definitive capture:

- Corrected home band stacking rather than preserving the prior incorrect layering.
- Captured and smoke-tested built static preview output, removing the Astro development-toolbar/static-preview ambiguity.
- Rebuilt the mobile trigger, close control, and disclosure chevron to source-measured geometry; disclosure behavior and Back state remain keyboard-tested.
- Corrected both article-link destinations: the retained Fellow profile source URL and the normalized Chemergy external URL.
- Corrected the `/read` Older Posts caret and the article next-item caret geometry, placement, and ink color.
- Corrected the focused desktop directory button foreground so its focus state meets serious/critical axe contrast coverage.
- Made unavailable local navigation targets explicit in the report and E2E contract instead of implying they resolve.
- Reconciled stale test totals, build metrics, capture heights, and report evidence with the definitive capture.

## Intentional accessibility and source-fidelity divergences

These are deliberate improvements or fixed spike boundaries, not unrecorded omissions:

- Desktop dropdowns expose `aria-expanded="true"` while open; Escape closes them and restores focus to the trigger.
- The mobile menu is a modal `<dialog>` with focus containment, Escape close, trigger-focus restoration, and body-scroll locking.
- Reduced-motion preferences reduce animation/transition duration and set scrolling behavior to `auto`.
- `/read` keeps a visually hidden semantic heading; `/23-annual-report` keeps a semantic document heading.
- Local PDF links use `rel="noopener noreferrer"`; the footer retains its two source text items as `<strong>` rather than inventing destinations.
- The source’s burger is represented with accessible controls and labels while preserving its measured two 35×1 px ink bars. Its raster phase is 0.42 CSS px different at DPR 3, but length, separation, color, and ink mass are matched; fitting a DPR-3 artifact would regress DPR 1 and 2.
- The mobile disclosure chevron uses the source path and bounding box. Its mask rasterization has about 5% more ink mass than the source with identical 35×67 device-pixel bounds; this is accepted rather than introducing a brittle raster-specific adjustment.

`tests/e2e/navigation.spec.ts` and `tests/e2e/accessibility.spec.ts` exercise the ARIA behavior, keyboard escape, modal containment, local assets, serious/critical axe coverage, the two retained article links, and the unavailable-route contract.

## Intentionally unavailable navigation destinations

The shared shell preserves these source-relative local paths, but Stage 1 does not generate pages for them. They are named in `src/components/navigation.ts`, `src/components/Footer.astro`, and the E2E contract; no test silently follows them:

- `/about-ehf`
- `/journey`
- `/our-values`
- `/impact-in-action`
- `/ehf-community-collective`
- `/ehf-fellows-articles`
- `/archive`
- `/fellow-directory-advanced-search`
- `/news`
- `/read/page/2` (the retained Older Posts affordance; pagination generation is outside the spike)

`https://www.ehf.org/news#fellows` remains an external source destination. `https://www.ehf.org/fellow-detail?fellow=Melahn-Parker#search=Mela&numRecords=24&minMatchCharLength=2` is the retained external Fellow profile source destination; its unimplemented `/fellow-detail` local counterpart is excluded from this spike. `https://www.chemergy.co/` is retained as the article’s external destination.

## Measurements

| Metric | Evidence and value |
|---|---|
| Runtime | `openai-codex/gpt-5.6-terra`; Node `v25.8.0`; npm `11.17.0`. |
| Observed Stage 1 implementation baseline | 5 h 24 m 16 s from the first spike capture commit (2026-08-07 16:02:53 +08:00) through the final application/test commit (2026-08-07 21:27:09 +08:00). The evidence-refresh run changed no source implementation. |
| Timed production build | Definitive capture: 3.10 s wall time and 343 ms for 4 pages after checking 29 files with no diagnostics. Post-report rerun: 3.10 s wall time and 341 ms for the same 4 pages and diagnostics. |
| Generated route count | 4. |
| `dist/` size | 32,894,171 bytes. |
| First-party JavaScript | No emitted JavaScript bundles in `dist/**/*.js`; inline first-party script bytes are `/` 3,093, `/read` 3,960, article 3,093, and annual report 3,093. |
| Local assets | 40 manifest records, 32,822,843 bytes: 26,507,394 image bytes, 445,540 font bytes, and 5,869,909 PDF bytes. |
| Implementation evidence | 11 PNG/JSON pairs, 22 files, 15,793,879 bytes; the source `source-evidence/screenshots/spike--*` set remained unchanged. |
| Automated tests | 120 defined checks: 12 unit and 108 E2E; 101 passed, 19 expected E2E skips, 0 failed. |
| Unresolved visual work | P0 0, P1 0, P2 0, P3 5, with all five dispositions above. |
| Source blocks requiring manual cleanup | 0 in the four routes: the article is Markdown in `src/content/impact/`, archive cards are typed data in `src/data/impactArchive.ts`, and report metadata is local page content. |

## Architecture-risk evaluation

1. **Can Astro reproduce the four layouts without fighting its rendering model? — Yes, for this spike.** The fresh build generates all four static pages and the final matrix has P0/P1/P2 at zero.
2. **Can source content become maintainable Markdown or typed data? — Yes, for this scope.** The selected article is Markdown and the 20 archive cards are typed data; the spike tests cover the generated article and card ordering.
3. **Can assets be localized deterministically without hotlinks? — Yes.** The 40-record manifest and the fresh asset verifier support this; built-preview smoke confirms local images load.
4. **Can shared navigation and footer work without a site-wide client framework? — Yes.** Astro component scripts provide the interactive shell, and navigation tests cover desktop/mobile pointer and keyboard behavior.
5. **Can desktop and mobile fidelity be reached with reusable CSS? — Yes, for the approved bar.** Tokens and template CSS support all 11 states; the five bounded P3 items remain explicit.
6. **Can remaining pages reuse these primitives rather than needing mostly unique templates? — Supported, not proven or authorized.** The four output types reuse the shell, navigation data, tokens, and template CSS; uncaptured routes need separate evidence.
7. **What elapsed time should replace the original full-site estimate? — Use the observed 5 h 24 m Stage 1 baseline, or 1.35 engineer-hours per fixed route only under comparable content depth, plus route-specific capture and verification.** It is not a Stage 2 commitment.

## Report self-review

The report is limited to observed layered evidence: definitive built-preview capture, automated verification, source/implementation metadata, source-measured icon refinement, and prior audits. It records all 11 states, every non-overlapping residual P3 disposition, resolved defects, intentional divergences, unavailable destinations, measurements, and the seven Stage 1 architecture risks. It does not treat the rate-limited extra audit as complete and does not authorize Stage 2.

gate recommendation: GO
