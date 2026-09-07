# Squarespace Runtime and Static-Mirror Decision Memo

**Status:** Recorded for owner decision. The existing Astro reconstruction remains the approved implementation until the owner expressly changes it.

**Decision owners:** EHF project owner decides permission, risk tolerance, and architecture. Engineering implements only the selected option.

**Related project rules:** [`AGENTS.md`](../../AGENTS.md#technical-direction) and [`PLAN.md`](../../PLAN.md#post-production-follow-up-public-fellow-directory).

## Question

The site must not *depend on Squarespace at runtime*. Does that prohibit locally copying the generated Squarespace HTML, CSS, JavaScript, and media as a static mirror? If it does not, should a mirror replace the Astro reconstruction strategy?

## Terms

- **Squarespace runtime:** Squarespace-hosted JavaScript and CSS bundles, their server-supplied page configuration, Squarespace image transforms, analytics, forms, commerce, authentication, and CMS APIs.
- **Knack runtime:** The separate Fellow Directory loader and public API. It is not Squarespace. The Directory is dynamic and cannot be preserved as a static mirror without changing its behaviour.
- **Static mirror:** Captured rendered HTML, permitted assets, and locally served CSS/JavaScript, with external service calls removed or intentionally retained. It makes no request to Squarespace to render a page after deployment.
- **Astro reconstruction:** The current approach: local semantic templates, local assets, and small purpose-built interaction code, without Squarespace-generated DOM or runtime.

## Facts

1. EHF owns its content and controls which content and assets may be reproduced. That does not establish ownership or redistribution rights for Squarespace platform code or third-party font files.
2. The current project rule says both that the finished site must not depend on Squarespace at runtime and that the implementation should avoid importing its generated DOM or runtime. These are related but distinct requirements.
3. A local static copy would satisfy the narrow operational requirement only if it contains every required resource locally and removes calls to Squarespace services. It would not automatically satisfy the maintainability or licensing requirements.
4. Squarespace bundles are generated against site-specific block identifiers, page configuration, and a Squarespace server context. Copying them therefore creates a brittle artefact: a source-content change becomes a capture-and-patch exercise rather than an edit of owned templates and content.
5. The current Directory source is built by Knack after page load. A static mirror cannot retain live search, pagination, or profile updates. It must either remain a live Knack integration, be reimplemented against an approved public data contract, or become a deliberately static snapshot.
6. The current Fellow Directory work is gated pending written approval of its public-data contract, dependency, licensing terms, test environment, and implementation plan. This memo does not lift that gate.

## Options

### A. Continue the Astro reconstruction — current decision

Keep source-derived local templates and assets. Do not copy Squarespace-generated DOM, CSS, or JavaScript into the finished site.

**Benefits:** readable source; local control; normal static-host operation; predictable editing; no Squarespace runtime dependence.

**Costs:** source presentation rules must be captured and tested. A field renderer or page template can drift if verification samples do not cover the full range of live content.

### B. Static mirror

Capture each approved public route after client rendering. Store allowed HTML, assets, and any locally redistributable supporting CSS/JavaScript. Rewrite internal URLs, remove analytics/forms/authentication/commerce calls, and serve the result as static files.

**Benefits:** fastest route to near-source visual fidelity for a fixed, static page set; preserves the browser's already-rendered page structure.

**Costs and risks:**

- Requires EHF to confirm permission to redistribute Squarespace-generated code and each third-party font or dependency. Engineering must not infer this permission from content ownership.
- Preserves inaccessible, generated markup and unmaintainable selectors. Each future content change requires another capture and regression comparison.
- Requires deliberate removal or replacement of forms, analytics, commerce, member-only controls, image transforms, and other external calls. Leaving a call in place is not a static mirror.
- Does not solve the dynamic Directory. That still needs an approved runtime integration or a replacement data pipeline.
- A mirror can be pixel-close without being functionally correct. Every route, navigation state, responsive viewport, link, form boundary, and browser console error still needs verification.

### C. Copy Squarespace bundles locally

Do not select this as a separate strategy. It combines the licensing uncertainty and opaque generated-code maintenance burden of a mirror with greater coupling to unavailable Squarespace server data. If an owner approves a mirror, capture rendered output and retain only the minimum local resources needed for it; do not attempt to recreate a Squarespace client environment.

## Decision

**Current decision: Option A remains in force.** The project will not ship Squarespace-generated DOM, CSS, or JavaScript unless EHF explicitly approves a change after confirming redistribution rights and accepting the mirror's maintenance model.

This decision corrects an earlier overstatement: the words “not at runtime” do not, by themselves, prohibit a local copy. The reasons not to copy are (1) unconfirmed redistribution rights for platform code and fonts, (2) the recorded maintainability goal, and (3) the fact that copying the runtime is not the same as copying EHF-owned content.

## What would change this decision

EHF must provide written approval covering all of the following:

1. Permission to retain and redistribute the specific Squarespace and third-party files selected for a mirror.
2. Which current public routes and interactive states the mirror must preserve.
3. Which external behaviours are intentionally removed, retained as external destinations, or replaced locally.
4. Acceptance that Directory search and profiles are excluded from a static mirror unless separately approved.
5. An owner-approved plan and acceptance test: desktop and mobile screenshots, internal-link crawl, console/network audit, accessibility check, and source-vs-local route inventory.

The executable EHF-specific mirror workflow, source/tooling reuse, acceptance criteria, and AI-harness budget are in [`2026-09-07-ehf-static-mirror-execution.md`](2026-09-07-ehf-static-mirror-execution.md).

## Mirror alternative: estimate from scratch

**Known scope:** the current route manifest contains **264 included public routes**. The existing source restoration already has local assets, a route inventory, browser tests, and capture tooling. A mirror from scratch cannot reuse Astro templates as its deliverable, but it can reuse the route inventory and approved local assets after provenance review.

| Work | Estimated engineering time |
| --- | ---: |
| Decide allowed routes/assets and obtain permission; reproduce capture environment | 16–24 hours |
| Build a deterministic Playwright capture and asset-rewrite pipeline | 32–48 hours |
| Capture and normalize 264 routes at desktop/mobile states; resolve render-time failures | 40–64 hours |
| Remove or replace external runtime calls; rewrite URLs, forms, analytics, media and navigation | 32–56 hours |
| Establish static-host output, redirects, content-update procedure, and error handling | 16–24 hours |
| Full link, console/network, accessibility, responsive screenshot, and manual representative-route QA | 40–64 hours |
| **Total for a fixed public-page mirror, excluding Directory and legal/owner wait time** | **176–280 hours (about 4.5–7 engineer-weeks)** |

This is an estimate, not a quote. It assumes one experienced engineer, no unexpected authenticated or protected routes, no requirement to preserve Squarespace forms/commerce/member features, and written approval to retain every required local file. It excludes EHF review time, legal advice, the dynamic Fellow Directory, and production release.

**Human-delivery cost formula:** `176–280 hours × agreed hourly rate`, plus legal review, storage/CDN, and replacement-service costs. Examples only: at NZ$150/hour, NZ$26,400–42,000; at NZ$250/hour, NZ$44,000–70,000. The actual rate is not known to this repository.

### AI harness and agent cost estimate

`omp models --json` currently reports price per million tokens in US dollars as follows: GPT-5.6 Terra, US$2 input / US$12 output; Claude Opus 5, US$5 input / US$25 output; DeepSeek V4 Flash, US$0.14 input / US$0.28 output; and DeepSeek V4 Pro, US$1.0494 input / US$3.1482 output. Cached reads are cheaper. Local browser automation and a local static build have no metered model cost.

**There is not yet a defensible page-to-token conversion.** The 264-route inventory establishes 528 desktop/mobile capture states. It does not establish how many model tokens a mirror consumes: deterministic capture, URL rewriting, asset download, and link checking use no model tokens. Model expenditure is determined by the number of agent calls, their context and output size, screenshot/DOM payload size, retries, and whether visual review is per-template or per-route.

The previous US$250–800 figure was a planning envelope, not a measured estimate. It must not be used as a forecast. **US$1,000 remains only a hard authorization cap**, not an expected bill.

#### Required calibration before authorizing the mirror

1. Build the capture/rewrite pipeline against a stratified sample of **23 routes**: one from each of the 18 included route families, plus second examples for the five high-volume article families (Impact, Watch, News, Fellows News Snapshot, and Contact/Media/Donation).
2. Capture those routes in both agreed viewports: **46 source states**. Run the complete proposed workflow: capture, asset localization, external-call removal, static output, representative visual comparison, link/console/accessibility checks, and one failure/retry.
3. Log model token receipts by routing tier: Terra for architecture and integration; Opus for representative visual decisions; Flash/Pro for manifests, crawl triage, and first-pass checks.
4. Calculate the full estimate from measured values, not page count alone:

   `model cost = fixed pipeline cost + (per-route mechanical cost × 264) + (per-template visual-review cost × selected states) + measured retry allowance`.

5. Stop for owner review at US$500 cumulative usage. Do not exceed US$1,000 without explicit approval.

The target operating model is small: Terra only for architecture, interaction repairs, security-sensitive work, and integration; Opus only for representative visual decisions; Flash/Pro for mechanical collection and triage. Per-route visual-model review is a deliberate scope choice and must be priced separately because it can dominate model expenditure.

This excludes human review, legal advice, hosting, browser-grid fees, and third-party replacement services. If model access is subscription-bundled rather than metered, the incremental invoice can be near zero, but the workload still consumes quota and risks throttling.

**Recommendation:** do not restart the completed public-site work as a mirror merely to avoid fidelity defects. For the Directory, repair the renderer using sanitized source markup and a multi-record source-parity contract, or obtain separate written approval for a Knack runtime. Reconsider a mirror only if EHF values one-time visual preservation above future editing and explicitly approves its redistribution and maintenance risks.
