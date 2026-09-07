# EHF Static Mirror Execution Memo

**Status:** Alternative implementation plan. It does not replace the approved Astro reconstruction unless the EHF project owner authorizes that change in writing.

**Decision context:** [`2026-09-07-squarespace-runtime-and-static-mirror.md`](2026-09-07-squarespace-runtime-and-static-mirror.md) records the architecture, permission, and Directory boundaries. This memo turns the standard website-mirroring workflow into an EHF-specific execution plan.

## Outcome

Produce a static-hostable snapshot of the approved public EHF route set. It must render locally without Squarespace network requests, use locally retained approved resources, preserve source-relative navigation, and be verified against the live source at the established desktop and mobile viewports.

This is a **mirror**, not a rewrite. It preserves post-rendered source HTML and the minimum permitted supporting resources rather than translating every page into Astro components.

## Scope and non-goals

### Included

- The **264 `kind: "included"` routes** in `source-evidence/route-manifest.json`.
- Their source-observed navigation, responsive markup, localizable CSS/JavaScript/fonts/images, redirects, and public document links.
- Source capture at **1440 × 1000** and **390 × 844**, with reduced motion and lazy-media scrolling, matching `scripts/capture-source.mjs`.
- Static-host output, internal-link verification, network/console audit, representative visual comparison, and accessibility smoke checks.

### Explicitly excluded until separately approved

- Fellow/Alumni Directory, advanced search, detail pages, live Knack searching/pagination, or any copy of public-directory records.
- Forms that submit to Squarespace, commerce, membership, authentication, analytics, or CMS editing surfaces.
- Any local copy of a Squarespace or third-party resource before EHF confirms it may be retained and redistributed.
- A simulation of Squarespace server APIs or a second custom content-management system.

The Directory is an application, not a static document set. The mirror must preserve its source link only if the owner supplies an approved destination policy; it must not silently manufacture a broken route.

## Why this toolchain

| Common tool | Normal use | EHF decision |
| --- | --- | --- |
| HTTrack / `wget --mirror` | Fast recursive copy of server-rendered public pages and page requisites | Use only as an independent crawl/link inventory. It cannot reliably preserve JavaScript-created state or record network provenance. |
| SingleFile / browser Save Page | One-off reference snapshot | Use for an exceptional one-page forensic capture only. It produces a poor multi-route maintenance format. |
| Browsertrix / Webrecorder WARC | Replayable web archive | Do not use as the production site. Useful if EHF also wants an archival evidence package. |
| Playwright / Puppeteer | Capture the browser-rendered DOM and all required resources after client JavaScript runs | Use as the primary mirror engine. It is already a project dependency and `scripts/capture-source.mjs` provides the capture contract. |

EHF therefore needs no new crawler runtime or browser dependency. The existing Playwright capture code is the base; `parse5` is already available for deterministic HTML rewriting.

## Target layout

```text
source-evidence/route-manifest.json         approved route input
mirror/raw/                                 gitignored captured DOM and network manifests
mirror/assets/                              gitignored fetched local candidates and hashes
mirror/output/                              gitignored static-host candidate
scripts/mirror-capture.mjs                  browser-rendered route capture
scripts/mirror-localize-assets.mjs           download, hash, classify, rewrite resource URLs
scripts/mirror-rewrite.mjs                   remove/replace prohibited calls and rewrite links
scripts/mirror-verify.mjs                    static-output route, link, network, console audit
tests/e2e/mirror.spec.ts                     browser acceptance checks against local mirror
tests/unit/mirror-rewrite.test.ts            deterministic URL and removal policy tests
source-evidence/mirror-policy.json           owner-approved resource and external-action policy
source-evidence/mirror-manifest.json         committed provenance map: source URL → local URL/policy
```

`mirror/raw`, `mirror/assets`, and `mirror/output` are generated evidence/candidates and must be ignored. The committed policy and manifest make every retained resource and every removed/replaced external action reviewable.

## Resource and rewrite policy

The owner-approved `source-evidence/mirror-policy.json` is the authority. Each captured URL must have exactly one disposition:

| Disposition | Result |
| --- | --- |
| `local` | Download once, record SHA-256 and source URL, rewrite all HTML/CSS references to a repository-relative local file. |
| `internal` | Rewrite to the mirror’s equivalent canonical route. |
| `external` | Keep an absolute URL only when the owner explicitly accepts it as an external destination. |
| `remove` | Remove the element/script. Applies to analytics, trackers, Squarespace forms, commerce, authentication, and unavailable integrations. |
| `replace` | Substitute an owner-approved static element or destination. The policy must name the replacement; engineering does not invent one. |

A source response is not accepted into the mirror merely because the browser requested it. Resource retention is permission-gated. The localizer must reject unknown hosts, non-HTTPS URLs, active script injection, and any URL without a policy disposition.

## Execution plan

### Task 1: Establish the approved mirror boundary

**Files:**
- Create: `source-evidence/mirror-policy.json`
- Create: `source-evidence/mirror-manifest.json`
- Modify: `.gitignore`
- Test: `tests/unit/mirror-rewrite.test.ts`

1. Copy the 264 included routes from `source-evidence/route-manifest.json`; exclude all directory routes until the separate Directory gate is approved.
2. Record every permitted resource host and every external-action policy in `mirror-policy.json`; leave no default allow rule.
3. Add the three generated `mirror/` directories to `.gitignore`.
4. Write failing unit tests for: unknown resource host rejection, URL rewrite to a local resource, an internal canonical link, an owner-approved external link, and removal of a prohibited analytics/form URL.
5. Implement a policy parser that refuses a non-exhaustive or contradictory disposition map.
6. Run `npm run test:unit -- tests/unit/mirror-rewrite.test.ts` and commit the boundary separately.

### Task 2: Capture rendered source routes and resources

**Files:**
- Create: `scripts/mirror-capture.mjs`
- Modify: `package.json`
- Test: `tests/e2e/mirror.spec.ts`

1. Derive `mirror-capture.mjs` from `scripts/capture-source.mjs`; preserve its route validation, 1440/390 viewports, reduced-motion context, deferred-media scrolling, and console/network recording.
2. For each approved route, wait for `networkidle`, capture `document.documentElement.outerHTML`, a full-page screenshot, a response manifest (URL, content type, response status, request initiator), final URL, title, and document height.
3. Store each route by encoded canonical path under `mirror/raw/`; never use a source slug directly as a filesystem path without validation.
4. Add `mirror:capture` and `mirror:capture:validate` scripts. Validation must fail on duplicate canonical routes, console errors, failed requests, or unknown source hosts.
5. Test one source route at each viewport and assert that capture emits DOM, screenshot, and a response manifest.
6. Run the capture against all approved routes only after the owner approves the resource policy.

### Task 3: Localize and rewrite the captured output

**Files:**
- Create: `scripts/mirror-localize-assets.mjs`
- Create: `scripts/mirror-rewrite.mjs`
- Modify: `source-evidence/mirror-manifest.json`
- Test: `tests/unit/mirror-rewrite.test.ts`

1. Download policy-approved resources into `mirror/assets/`, deduplicate by SHA-256, and write a source URL → local pathname record to the committed manifest.
2. Parse captured HTML with `parse5`; rewrite `href`, `src`, `srcset`, `poster`, inline style URLs, stylesheet URLs, and local CSS `url(...)` references through the manifest.
3. Remove policy-marked script tags, analytics pixels, form actions, commerce/member controls, and unsupported scripts. Keep only policy-approved local scripts required by the rendered snapshot.
4. Write static documents into `mirror/output/`, using `/route/index.html` for every non-root route and the route manifest as the only route source.
5. Add unit fixtures covering: `srcset`, nested CSS URLs, query-string image transforms, an internal route, an external document, a removed form, and an unrecognized resource. Each test must prove its expected output or rejection.
6. Regenerate the mirror after every policy/manifest change; do not hand-edit generated output.

### Task 4: Verify the static mirror as a browser surface

**Files:**
- Create: `scripts/mirror-verify.mjs`
- Test: `tests/e2e/mirror.spec.ts`

1. Launch a dependency-free local static server over `mirror/output/`.
2. Visit every manifest route at desktop and mobile. Fail on missing page, missing local asset, console error, failed local request, a Squarespace host request, or a link to an excluded/unknown internal route.
3. Select one representative route for each of the 18 existing template families; compare its source and mirror screenshots at both viewports. The comparison report must name every differing route/state; it cannot aggregate failures away.
4. Exercise source-observed navigation states from `source-evidence/source-contract.json`: desktop About/Impact menus, mobile menu, pagination state, editorial content scroll state, and filled-form display state where retained.
5. Run `axe-core` smoke checks on every representative route and a full link crawl on all 264 routes.
6. Publish only a non-production preview for owner review. Production promotion requires explicit acceptance of the route, resource, interaction, and comparison reports.

### Task 5: Define recapture and retirement behaviour

**Files:**
- Create: `docs/decision-memos/mirror-operations.md`
- Modify: `PLAN.md`

1. Document that a source update requires a fresh capture, manifest diff, asset permission review, complete static verification, and owner review before publication.
2. Document that Squarespace forms/commerce/authentication are not live features in the mirror unless a separately approved replacement is implemented.
3. Preserve the capture date and source URL in the manifest; do not represent the snapshot as live CMS content.
4. Record the Directory destination policy before release; do not hide or silently redirect the excluded application routes.

## Acceptance criteria

The mirror is acceptable only when all are true:

1. Every one of the 264 approved routes serves as static output and no excluded route is generated.
2. Every retained resource has an approved policy entry, SHA-256, and local/external disposition in `mirror-manifest.json`.
3. Browser verification sees no Squarespace request, broken internal link, missing local resource, unapproved external service call, console error, or failed request.
4. Every template family has desktop and mobile screenshot evidence, with differences reviewed explicitly rather than ignored.
5. All retained source interactions work; every removed/replaced external behaviour is identified in the policy and visible to the owner.
6. The Directory is either excluded with an owner-approved destination policy or separately implemented after its written approval gates.

## AI-harness estimate and budget control

The route count is not a token count. The crawl, capture, asset download, parsing, rewriting, local server, and all-route link/network tests are deterministic Playwright/Node work. Agent cost arises from implementing the pipeline, interpreting failures, and reviewing representative screenshots.

**Expected metered model cost: US$100–350. Hard cap: US$500.** This is an inference based on the toolchain above and current routing, not a prior token ledger.

| Work | Routing | Token assumption | Cost arithmetic |
| --- | --- | ---: | ---: |
| Pipeline design, capture/rewrite implementation, integration | GPT-5.6 Terra | 10–25M input; 1–3M output | `(10–25 × $2) + (1–3 × $12)` = **US$32–86** |
| Representative visual review: 18 families × 2 viewports, plus failures | Claude Opus 5 | 2–8M input; 0.25–1M output | `(2–8 × $5) + (0.25–1 × $25)` = **US$16–65** |
| Bulk crawl/manifest/link triage | DeepSeek Flash / Pro | 20–100M input; 1–8M output | **US$3–130** depending on Flash/Pro mix |
| Rework, context misses, and second full verification | mixed | 1–2× first-pass variable work | **US$49–69** reserve |
| **Expected total** | — | — | **US$100–350** |

This estimate stays credible only if browser collection and all-route validation remain scripted, and Opus reviews representatives rather than all 528 source states. A per-route visual-agent pass is a separate decision; it can exceed the US$500 cap.

Operational controls:

- Start with one representative route per each of the 18 template families, then add one second example for the five high-volume families before scaling capture.
- Record model usage after the pipeline/representative pass. If that pass exceeds US$150, stop and revise the cost forecast before bulk work.
- Stop at US$350 for owner review. Do not exceed US$500 without explicit approval.
- Use no paid hosted browser grid: local Playwright and the existing Vercel preview are sufficient for the defined verification.

## Recommendation

If EHF approves a mirror, execute this browser-rendered pipeline rather than attempting to copy Squarespace’s runtime wholesale. It uses standard site-mirroring practice, preserves the rendered public output, and confines model use to the places where judgment is useful. Keep the Directory as a separate architectural decision.
