# EHF Astro Spike Execution Design

**Status:** Ready for project-owner review; implementation remains blocked until that review is complete.

## Purpose and authority

This document defines how the four-page Astro spike is delegated, integrated, verified, and stopped. `AGENTS.md` remains the authority for project purpose, source fidelity, exclusions, and working rules. `PLAN.md` remains the authority for implementation steps, commands, and planned files. This design adds role boundaries and checkpoints without restating the full plan.

If live EHF behavior, this design, `AGENTS.md`, and `PLAN.md` cannot be reconciled, work on the affected item stops. The parent manager presents the evidence to the project owner; the approved project documents are corrected before implementation resumes. No agent builds from an unsupported assumption.

The project owner must review this design before any spike implementation begins. Approval to run the spike does not authorize Stage 2.

## Fixed spike boundary

The spike implements exactly these four routes:

1. `/` — bespoke landing page.
2. `/read` — first-page collection listing.
3. `/read/how-chemergy-is-changing-the-game-in-waste-to-energy` — the single generated Impact article.
4. `/annual-reports` — document-oriented institutional page.

The shared work needed by those routes is included: one header, captured desktop dropdowns, mobile full-screen navigation, footer, measured responsive styles, permitted local assets, and only the browser behavior visible in the captured states. The two fixed comparison viewports are 1440 × 1000 and 390 × 844.

The article collection must generate only the named Chemergy article during the spike. The `/read` data shape may be ready for later build-time pagination, but no pagination route or bulk archive migration is part of the spike. Navigation links may retain final source-relative destinations that are not implemented; `SPIKE-RESULTS.md` must identify them as intentionally unavailable in the spike.

### Explicit exclusions

The spike does not include:

- any fifth route, complete sitemap inventory, bulk content migration, redirect program, deployment, analytics, or production form backend;
- Stage 2 tasks or preparatory work whose only consumer is Stage 2;
- any EHF Fellow Directory, alumni directory, fellow-detail, advanced-search, iframe-backed directory, or directory-data behavior;
- any Hillary Institute page;
- Squarespace administration, CMS, commerce, authentication, member areas, generated DOM, CSS, or runtime;
- stale, malformed, duplicate, test, staging, or obsolete source paths;
- a redesign or invented copy, imagery, interactions, responsive states, or accessibility behavior;
- runtime hotlinks to Squarespace-hosted images, fonts, icons, CSS, JavaScript, or permitted downloadable documents.

The spike ends only after the four routes and `SPIKE-RESULTS.md` are complete. Nothing in this design grants authority to inventory, migrate, or implement the remaining EHF site.

## Astro architecture under evaluation

Astro generates static HTML from TypeScript, focused `.astro` components, and local CSS. A shared site layout owns metadata, header, main landmark, and footer. The homepage, archive, article, and Annual Reports page remain four distinct templates that reuse the shared shell and measured primitives rather than imitating Squarespace markup.

The Chemergy article uses an Astro content collection with typed frontmatter and local Markdown. Other bounded spike content may use typed local data where that is simpler. Components receive normalized data and `/assets/...` references; they do not fetch EHF or Squarespace content at runtime. Client-side JavaScript is limited to captured interactions such as dropdown and mobile-menu state, body-scroll locking, Escape dismissal, and focus restoration. Reduced-motion behavior must not depend on animation completing.

Assets are addressed through a source-to-local manifest. Permitted images, logos, icons, fonts, and documents live under `public/assets/`, are deduplicated by SHA-256, and retain provenance and attribution. A document that must remain external is recorded explicitly in the manifest and presented as an external destination; it is not silently copied or described as local.

This architecture is a hypothesis tested by the spike. It becomes the basis for the full site only after the mandatory gate.

## Roles and exact model routing

| Role | Exact route | Responsibility |
|---|---|---|
| Parent manager | Management only; no implementation route | Defines dispatch boundaries, assigns file leases, enforces checkpoints, reviews evidence, communicates with the project owner, and enforces the owner-review checkpoint and mandatory spike gate. The parent manager performs no implementation work, does not edit application files, and does not substitute for BuildLead. |
| BuildLead | **GPT-5.6 Terra High** | Owns technical planning, Astro implementation, integration, tests, verification, final screenshots, discrepancy resolution, and `SPIKE-RESULTS.md`. BuildLead is the only technical integrator and decides whether bounded handoffs meet the documented contracts. |
| VisualDesigner | **Anthropic Claude Opus 5 High** | Owns source visual analysis, measurements, required source states, visual comparison, and a later exclusive visual-refinement pass. It reports measured evidence rather than inventing design decisions. |
| ContentAssets | **DeepSeek V4 Flash 0731 High**, using the sonic role | Performs bounded mechanical extraction of approved spike content and permitted assets, calculates hashes, maintains manifests, and provides local content. It must not edit shared application code. |

Model substitution requires project-owner approval recorded by the parent manager before the affected role starts. A failed or unavailable agent does not transfer its authority implicitly.

## File ownership and leases

Ownership is exclusive while a coordination phase is active:

- **Parent manager:** owns no implementation file. Its outputs are dispatch instructions, checkpoint decisions, evidence review, and owner communication.
- **BuildLead:** owns `package.json`, Astro/TypeScript/test configuration, `scripts/capture-source.mjs`, `scripts/download-assets.mjs`, `scripts/verify-local-assets.mjs`, `source-evidence/spike-routes.json`, all tests, all application code under `src/` except the one ContentAssets Markdown file and files temporarily leased for visual refinement, and `SPIKE-RESULTS.md`.
- **VisualDesigner:** owns `source-evidence/screenshots/spike--*` and each adjacent capture-metadata record. During its refinement phase, the manager grants it an exclusive, enumerated lease over the relevant presentational files in `src/styles/` and `.astro` templates/components. The lease permits fidelity changes only; routing, data contracts, content schemas, semantic behavior, and tests remain BuildLead-owned.
- **ContentAssets:** owns `public/assets/**`, `source-evidence/asset-manifest.json`, and `src/content/impact/how-chemergy-is-changing-the-game-in-waste-to-energy.md`. Other extracted copy is delivered as a bounded handoff for BuildLead to place in typed application data. ContentAssets does not edit `.astro`, `.ts`, CSS, configuration, scripts, or tests.

Before a temporary lease starts, BuildLead records the accepted baseline and stops editing the leased files. VisualDesigner returns a list of changed files and source comparisons. The manager closes the lease before BuildLead resumes integration. Unlisted files remain with their normal owner; agents do not create alternative copies to bypass ownership.

## Staged coordination

### Checkpoint 0 — owner review

The parent manager sends this design to the project owner. Implementation begins only after the owner explicitly approves running the four-page spike. The manager then dispatches the three bounded roles with the routes, files, outputs, and acceptance evidence defined here.

### Phase 1 — source contract

BuildLead prepares the fixed route manifest and capture mechanism. VisualDesigner captures eight default screenshots (four routes at two viewports) plus the homepage Impact dropdown, About dropdown, and open mobile-menu states. Every screenshot has adjacent metadata containing source URL, route, viewport, state, capture time, document height, console errors, and failed network requests. VisualDesigner also reports measured typography, color, widths, gutters, spacing, image crops, responsive order, and interaction behavior.

The parent manager checks route and state completeness before local content or visual implementation is accepted. A source state is not inferred from a different viewport.

### Phase 2 — bounded inputs and technical base

After source records for a route are accepted, ContentAssets may extract only that route's permitted assets and approved content. BuildLead may develop the Astro base and tests in parallel, but must not finalize visual decisions before the relevant source measurements arrive. ContentAssets returns local paths, SHA-256 values, source URLs, permission status, attribution, and any retained external-document destinations. BuildLead validates the handoff before consuming it.

### Phase 3 — BuildLead integration

BuildLead builds the shared shell and exactly four templates, connects typed local content, adds only the captured interactions, and integrates local assets. It owns shared CSS and resolves cross-page conflicts. Functional verification must pass before visual refinement starts.

### Phase 4 — exclusive visual refinement

The manager grants VisualDesigner the temporary presentational-file lease. VisualDesigner compares source and implementation at identical viewports and states, corrects fidelity issues within the lease, and records remaining differences by severity. No other role edits leased files concurrently.

### Phase 5 — verification, report, and stop

After the lease closes, BuildLead integrates the result, runs final spike verification, captures the matching implementation evidence, and writes `SPIKE-RESULTS.md`. The manager checks the report and presents it to the project owner. All implementation activity then stops at the gate.

## Data and asset flow

1. The fixed route manifest limits capture to the four approved paths and two approved viewports.
2. VisualDesigner turns the live site into source evidence: screenshots, state metadata, measurements, visible interactions, and discrepancy observations.
3. ContentAssets uses accepted evidence and approved public source material to produce permission-scoped local files, hashes, manifest entries, and the one article Markdown entry.
4. BuildLead validates manifest completeness, content structure, and local-path references, then consumes those inputs through typed collections or typed data.
5. Astro renders static routes and shared components. Runtime code reads only first-party build output and explicitly retained external document destinations.
6. BuildLead captures implementation screenshots in the same route, viewport, and state matrix. `SPIKE-RESULTS.md` links implementation evidence back to its source evidence and records the outcome.

A handoff is accepted only when its route, source URL, local destination, and provenance agree. Unapproved material never advances to implementation merely because it was downloadable.

## Failure handling

- **Source conflict or missing state:** VisualDesigner records the conflict. The affected route or state pauses; the manager obtains an owner decision and the project documents are updated before BuildLead proceeds.
- **Permission uncertainty:** ContentAssets does not copy the item. It marks the item blocked with its source and intended use. BuildLead either uses an owner-approved external destination or records the missing input as a spike blocker; it does not hotlink a substitute.
- **Download, hash, or manifest mismatch:** ContentAssets rejects the file and repeats the bounded extraction. BuildLead does not reference an asset until its manifest entry and local bytes agree.
- **Invalid role handoff:** BuildLead rejects incomplete technical inputs; the manager reassigns the same bounded work without changing file ownership or expanding scope.
- **Build, browser, accessibility, or console failure:** BuildLead reproduces and fixes the failure before a `GO` recommendation. If it cannot be resolved within the approved spike, the exact failure and evidence become an `ADJUST` or `STOP` blocker.
- **Visual discrepancy:** all P0 and P1 differences must be resolved. A P2 that could invalidate Astro, a template, or reusable CSS must also be resolved. Remaining cosmetic P2 and P3 differences must be quantified in the report.
- **Scope breach:** the manager rejects any fifth route, bulk migration, or Stage 2-only artifact from the spike. It is not included in verification or the spike commit history.
- **Role unavailability:** the manager pauses the role's phase and seeks an approved reroute; another agent does not assume the role silently.

Failure evidence is retained. A green build never overrides missing source, visual, accessibility, asset, or scope evidence.

## Required verification evidence

BuildLead must produce or verify all of the following during implementation:

- the eight default source screenshots and three homepage interaction-state screenshots, with complete adjacent metadata;
- a manifest mapping every consumed source asset to its local path, SHA-256 value, permission status, and attribution, plus any explicitly retained external report destination;
- static build output for exactly the four approved routes, with `getStaticPaths()` emitting exactly the one spike article;
- an asset check proving `src/` and `dist/` contain no runtime references to the listed Squarespace asset domains;
- browser route evidence showing each page responds successfully, contains a visible `main`, and uses local page imagery;
- pointer and keyboard evidence for desktop dropdowns and the mobile menu, including Escape, focus restoration, and body-scroll behavior;
- accessibility, reduced-motion, broken-link, missing-asset, and browser-console results required by `AGENTS.md` and the spike tasks in `PLAN.md`;
- implementation screenshots matching the source route, viewport, and state matrix, with every difference listed by severity, resolution, or quantified follow-up;
- the measurements and seven technical-risk answers required by Spike Task S4, including build time, generated-route count, output size, first-party JavaScript by route, local-asset totals, automated-check results, unresolved visual counts, manual cleanup, architecture fit, content maintainability, deterministic localization, shell behavior, reusable responsive CSS, expected template reuse, and revised elapsed-time evidence.

The four-page spike is acceptable only when all four routes build as static EHF content, the shared shell works at both viewports, consumed assets are local or explicitly approved external documents, there are no unresolved P0/P1 or architecture-blocking P2 visual differences, and every failed check is either fixed or documented as a blocker supporting `ADJUST` or `STOP`.

## Mandatory GO / ADJUST / STOP gate

`SPIKE-RESULTS.md` ends with exactly one unapproved recommendation in one of these forms:

```text
gate recommendation: GO
```

```text
gate recommendation: ADJUST
```

```text
gate recommendation: STOP
```

The recommendation is evidence, not authorization:

- **GO:** the project owner explicitly authorizes Stage 2. Only then may the manager dispatch Tasks 2–14.
- **ADJUST:** implementation remains stopped. BuildLead revises the documented architecture or workflow as directed, the affected spike checks are rerun, and the owner reviews a new recommendation.
- **STOP:** Astro is not accepted for the full build. Evidence is preserved and no further Astro implementation begins.

Silence, report approval, a passing build, or completion of the four routes is not a `GO`. Only explicit project-owner authorization after reviewing `SPIKE-RESULTS.md` opens Stage 2.
