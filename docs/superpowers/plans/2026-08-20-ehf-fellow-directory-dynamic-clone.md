# EHF Fellow Directory Dynamic Clone Plan

**Status:** Planning only. Stakeholder approval required before implementation.

**Goal:** Move the live Fellow Directory from the Squarespace shell into the Astro site while preserving Knack as the editable system of record, retaining current public behavior, and enforcing Fellow visibility choices before data reaches a visitor’s browser.

**Architecture:** Keep Fellow editing in the existing Knack `Fellows` table. Add a separate Knack `Public Fellow Profiles` projection table containing only approved public values. Knack automation updates that projection whenever a Fellow record or visibility setting changes. Basic Search, Fellow Detail, Advanced Search, and Alumni Search read only projection-backed public views. Reuse the existing EHF-licensed Optimi JavaScript and Knack embeds with the minimum field/view remapping required by that boundary.

**Tech stack:** Knack as the system of record and projection engine; Astro 7 static site shell; existing browser-side Optimi directory code; current jQuery/Fuse/lazy-image dependencies; Knack public view APIs and embeds; Vitest, Playwright, and `@axe-core/playwright`.

---

## Decision and rationale

Fellows must continue updating their own profiles in Knack. A one-time static snapshot is therefore rejected.

The current direct browser integration can remain only if its public views read a safe projection rather than the mixed public/private `Fellows` table. Authenticated schema inspection confirmed that public view `scene_161` / `view_490` explicitly includes raw Fellow Type, Gender, Citizenship, and Residence fields. The Optimi JavaScript removes disallowed values only after Knack has sent them to the browser.

Knack documents that display rules are client-side and are not a security boundary. It also documents that a view-based `GET` returns every field included in that view. Merely adding display rules or hiding columns visually cannot fix the issue.

A separate public projection table is the durable fix because every field in that table is safe to publish by construction. It preserves live Knack editing without adding a second vendor or external database.

## Authorization boundary

This document is the deliverable. Do not change Knack, copy licensed Optimi source, alter route classifications, add dependencies, implement pages, deploy, or alter Squarespace until all gates below are satisfied in writing.

Implementation may begin only after:

1. EHF approves the immediate containment action and durable projection design.
2. EHF confirms in writing that the Optimi license permits the code to be copied into and served from the public `ehfarchive/ehf.org` repository and replacement site.
3. Stakeholders approve Knack remaining a live production dependency.
4. Stakeholders approve the exact public-field contract and route behavior.
5. EHF prepares a duplicated Knack application or private duplicate views for remediation testing.
6. The owner approves this exact plan and authorizes a fresh implementation branch.

Do not use production Fellow records in committed fixtures, logs, screenshots, or incident-document examples. Do not expose or commit the private Knack REST API key.

## Verified current architecture and incident facts

Verified read-only on 2026-08-20:

- The Knack application contains 23 objects.
- `object_2`, `Fellows`, contains 145 fields.
- Basic Search and Fellow Detail use public list view `scene_161` / `view_490`.
- That view explicitly includes the raw protected values and their visibility controls:

| Attribute | Raw field | Visibility field |
|---|---|---|
| Fellow Type | `field_649` | `field_685` |
| Gender | `field_314` | `field_686` |
| Citizenship | `field_393` | `field_689` |
| Residence/location | connected `field_701` | `field_691` |

- The view’s source criteria filter records only: Active, enabled for directories, profile image present, and not a test record.
- The view has no server-side per-record field projection.
- The public API response contains raw values that the browser subsequently blanks:

| Attribute | Visibility off with raw value returned |
|---|---:|
| Fellow Type | 19 |
| Gender | 436 |
| Citizenship | 52 |
| Residence/location | 33 |

- Advanced Search `scene_340` / `view_649` and Alumni Search `scene_399` / `view_728` include raw Fellow Type without the visibility control.
- Advanced Search already uses `field_855`, a safe public residence projection. It was blank for all 33 current Fellows whose residence visibility was off. This proves the projection pattern works in the existing Knack application.
- Existing fields `field_719` and `field_720` are not safe public projections; they remain populated for many records whose visibility is off.

## Immediate containment

Before building the durable projection, remove the four raw protected attributes from every unauthenticated public view.

Affected views to inspect include:

- `scene_161` / `view_490` — Basic Search and current Fellow Detail data.
- `scene_340` / `view_649` — Advanced Search.
- `scene_398` / `view_727` — alumni external data view.
- `scene_399` / `view_728` — Alumni Search.
- `scene_401` / `view_732` — public Fellow detail view.

Containment behavior:

- Remove raw Fellow Type, Gender, Citizenship, and Residence fields wherever present.
- Remove any unsafe legacy substitutes such as `field_719` and `field_720`.
- Keep `field_855` for public residence only after confirming its zero-leak audit remains true.
- Accept that affected attributes temporarily disappear from public profiles and search.
- Do not attempt to preserve display by adding a visual hide rule.

Containment must be tested on duplicated/private views first. Production modification is a separately authorized action.

## Durable public projection architecture

### Source table

The existing `Fellows` table remains authoritative. Fellows continue using the existing Knack update workflows. It may contain public, internal, and private values.

### Projection table

Create `Public Fellow Profiles` with one public record per eligible Fellow. This table must contain no private values, visibility settings, account state, approval state, internal notes, utility keys, or raw connection objects.

Proposed schema:

```ts
export type PublicFellowProfile = {
  sourceFellowId: string; // internal automation key; never include in public views
  status: 'current' | 'alumni';
  slug: string;
  name: string;
  aliases: string[];
  pronouns?: string;
  headline?: string;
  profilePhoto?: KnackImage;
  cohortNames: string[];
  fellowTypes: string[];       // copied only when Public directory is enabled
  gender?: string;             // copied only when Public directory is enabled
  citizenships: string[];      // copied only when Public directory is enabled
  residences: string[];        // copied only when Public directory is enabled
  industries: string[];
  otherIndustries: string[];
  keySkills: string[];
  globalNetworks: string[];
  modesOfWorking: string[];
  organisationTypes: string[];
  careerHighlights?: string;
  keyNetworks?: string;
  impactGoals?: string;
  ecosystemSupport?: string;
  supportRequested?: string;
  ventures: PublicLink[];
  sustainableDevelopmentGoals: PublicLink[];
  tags: string[];
  updatedAt: string;
};
```

The concrete Knack fields may use text, multiple-choice, connection, image, or rich-text types as appropriate. The security invariant is independent of type: a public projection record must contain only publishable values.

### Projection rules

A Knack Flow or equivalent server-side automation runs when:

- a Fellow creates or updates a profile;
- a visibility setting changes;
- directory eligibility/status changes;
- a profile image changes;
- connected ventures, cities, citizenships, cohort, industries, links, or Sustainable Development Goals change.

For every update:

1. Determine whether the Fellow is eligible for the current or alumni public directory.
2. Create or update exactly one matching projection record.
3. Copy always-public fields.
4. Copy each protected field only when its visibility setting contains `Public directory`.
5. Explicitly clear the projected value when visibility is removed.
6. Remove or unpublish the projection when directory eligibility is removed.
7. Record projection update time and a non-sensitive reconciliation status.

Knack conditional rules may be used for simple same-record values. Knack documents that rules can set a field from another field, but an explicit opposite/default rule is required to clear stale values. Multi-record and connected-field projection should use Knack Flow or another server-side Knack automation so all dependent updates are handled consistently.

### Reconciliation and backfill

Before public cutover:

1. Backfill every eligible current Fellow and alumnus into the projection table.
2. Compare source eligibility counts with projection counts.
3. Assert one projection per source Fellow.
4. Assert no orphan projections.
5. Assert every visibility-off protected value is blank.
6. Assert every visibility-on value expected for display is present or intentionally empty.
7. Run the projection twice and prove idempotence.
8. Add a scheduled reconciliation that reports drift without publishing raw values.

## Public view contract

Create or repoint public views so they use only `Public Fellow Profiles`:

| Public surface | Required source |
|---|---|
| Basic Search data | Public projection list view |
| Fellow Detail data | Public projection list/details view filtered by public slug |
| Advanced Search `dist_2` | Search view over public projection |
| Alumni Search `dist_3` | Alumni-filtered search view over public projection |

No unauthenticated view may include a connection back to raw Fellow fields. The internal `sourceFellowId` or source connection may exist for automation but must not be configured as a field in any public view.

## Existing code reuse and remapping

### Basic Search

Preserve:

- Fuse.js behavior and weighting.
- quoted exact-match search.
- search/hash restoration.
- random initial discovery.
- 24-result initial display and load-more increments.
- lazy images, cards, counts, and error states.

Change:

- endpoint from `scene_161` / `view_490` to the approved projection view;
- field keys from raw Fellow fields to public projection fields;
- selectors that depend on Squarespace-generated block IDs;
- dependency imports so the route is self-contained.

Remove the client-side privacy deletion logic only after network tests prove that projection responses contain no protected raw values. Keeping the checks temporarily as defense in depth is acceptable, but they must never be treated as access control.

### Fellow Detail

Preserve query/hash parsing, legacy slugs, return-state behavior, section omission, links, images, and errors. Remap every rendered field to the public projection view. Do not query `object_2` or `view_490` from the public site after cutover.

### Advanced and Alumni Search

Rebuild or repoint `dist_2` and `dist_3` search views over the public projection table while retaining the visible filters, result layout, pagination, and inline-detail behavior. Do not retain raw `field_649` or connected raw Fellow fields merely to preserve field IDs.

## Route contract

Extend the route manifest with:

```ts
type DirectoryTemplateFamily =
  | 'fellow-directory-basic'
  | 'fellow-detail'
  | 'fellow-directory-advanced'
  | 'alumni-directory-advanced';
```

| Path | Disposition |
|---|---|
| `/fellow-directory` | Included, Basic Search |
| `/fellow-detail` | Included, current query/hash-based detail page |
| `/fellow-directory-advanced-search` | Included, Advanced Search |
| `/alumni-directory-advanced-search` | Included, Alumni Search |
| `/alumni-directory` | Permanent redirect to `/alumni-directory-advanced-search` |
| `/copy-060421-exact-match-fellow-directory` | Remains excluded duplicate |

Do not generate per-Fellow static routes. Do not rewrite archived article links.

## Licensing and dependency contract

Before copying code, inventory the exact jQuery, `jquery.lazy`, Fuse.js, line-clamping, Soluntech/Knack helper, and Squarespace selector dependencies. Pin retained versions and preserve copyright/license notices.

The Optimi header states that the code is licensed for EHF and may not be reposted without permission. Written permission for the public repository and replacement site is a hard prerequisite.

## Runtime host policy

Permit only required Knack API, loader, regional renderer, profile asset, and explicitly retained dependency hosts. Do not add wildcard network permissions. Browser tests must fail on unexpected directory hosts.

Knack remains an intentional live dependency. Show a clear error when Knack is unavailable; never silently display stale or partial profiles.

## Exact implementation file map

| Path | Planned action |
|---|---|
| `source-evidence/route-manifest.json` | Reclassify directory routes and alumni redirect |
| `source-evidence/source-contract.json` | Add source states and projection-backed data contract |
| `src/lib/route-manifest.ts` | Add directory template families |
| `src/data/site.ts` | Add manifest-validated directory navigation |
| `src/pages/fellow-directory.astro` | Basic Search route |
| `src/pages/fellow-detail.astro` | Legacy query/hash detail route |
| `src/pages/fellow-directory-advanced-search.astro` | Projection-backed Advanced Search embed |
| `src/pages/alumni-directory-advanced-search.astro` | Projection-backed Alumni Search embed |
| `src/components/directory/DirectoryMenu.astro` | Directory subnavigation |
| `src/components/directory/BasicDirectory.astro` | Stable Basic Search DOM |
| `src/components/directory/FellowDetail.astro` | Stable Detail DOM |
| `src/components/directory/KnackEmbed.astro` | Explicit projection-backed Knack embeds |
| `src/components/directory/basic-directory.ts` | Authorized Optimi code with endpoint/field/selector remapping |
| `src/components/directory/fellow-detail.ts` | Authorized Optimi code with endpoint/field/selector remapping |
| `src/styles/templates.css` | Directory source-fidelity styles |
| `vercel.json` | Exact required network/security declarations |
| `tests/unit/directory-contract.test.ts` | Query/hash, selector, public schema, remapping, and privacy contracts |
| `tests/e2e/fellow-directory.spec.ts` | Basic, Detail, Advanced, Alumni, accessibility, failure, and network behavior |

Knack-side artifacts are configured in the Builder/Flows rather than stored in this repository. Record their non-secret object/view keys and approved field map in `source-evidence/source-contract.json` after stakeholder authorization.

## Execution sequence

### Ticket 0: Containment and gates

- [ ] Duplicate the Knack application or public views for safe testing.
- [ ] Remove raw protected fields from duplicate public views and verify the response.
- [ ] Obtain approval for temporary production removal of protected attributes.
- [ ] Confirm Optimi permission.
- [ ] Approve the public-field contract and projection design.
- [ ] Authorize implementation branches and Knack change ownership.

**Acceptance:** duplicate-view proof shows protected raw fields absent; all approvals are written. Production remains unchanged until a separate containment authorization.

### Ticket 1: Public projection schema and automation

- [ ] Create `Public Fellow Profiles` in the duplicate application.
- [ ] Add only approved public fields.
- [ ] Implement create/update/clear/unpublish automation.
- [ ] Handle changes to connected records.
- [ ] Add idempotent backfill and drift reconciliation.
- [ ] Test synthetic and stakeholder-approved canary profiles covering every visibility transition.

**Acceptance:** exact eligibility/projection counts, one-to-one mapping, no orphans, no visibility-off values, and repeated reconciliation produces no changes.

### Ticket 2: Projection-backed Knack views

- [ ] Create Basic and Detail views over the projection.
- [ ] Rebuild/repoint Advanced and Alumni search views over the projection.
- [ ] Match current filters, ordering, page sizes, result columns, and inline details.
- [ ] Verify all public responses contain only projection fields.

**Acceptance:** public response schema is allowlisted and raw Fellow fields are absent across all four surfaces.

### Ticket 3: Source and dependency contract

- [ ] Capture desktop/mobile/default/loading/search/error/detail/embed states.
- [ ] Inventory scripts, versions, licenses, hosts, field maps, and selectors.
- [ ] Add route/source contracts without production record bodies.
- [ ] Write failing synthetic tests for projection schemas and remapping.

**Acceptance:** complete source contract and failure-first tests.

### Ticket 4: Astro shells and embeds

- [ ] Implement manifest-backed routes and directory navigation.
- [ ] Reproduce stable semantic DOM hooks.
- [ ] Integrate projection-backed Advanced and Alumni embeds.
- [ ] Verify Astro does not interfere with hash routing or Knack styles.

**Acceptance:** route shells and embeds work against projection test views.

### Ticket 5: Basic Search and Detail reuse

- [ ] Copy authorized Optimi source with notices intact.
- [ ] Remap endpoint, projection fields, and stable selectors.
- [ ] Preserve search, hash, randomization, pagination, images, profile rendering, links, and errors.
- [ ] Verify archived `/fellow-detail?...` links.

**Acceptance:** current behavior is preserved while every network response satisfies the public projection allowlist.

### Ticket 6: Full verification and preview

- [ ] Match desktop/mobile source geometry and interaction states.
- [ ] Verify accessibility and reduced motion.
- [ ] Simulate API, automation, embed-loader, empty-response, and unknown-slug failures.
- [ ] Assert exact allowed network hosts and response schemas.
- [ ] Run unit, route, content, asset, build, browser, accessibility, responsive, console, and network checks.
- [ ] Produce a stakeholder preview without changing the custom domain.

**Acceptance:** all checks pass; projection freshness is demonstrated from Fellow edit to public page; stakeholders accept the preview.

## Dependency graph

```text
Containment approval + Optimi permission + public-field approval
                              |
                              v
              Projection schema and automation
                              |
                              v
                  Backfill and reconciliation
                              |
                              v
                 Projection-backed Knack views
                              |
                              v
                 Source/dependency contract
                              |
                              v
                    Astro routes and shells
                     /                \
                    v                  v
          Basic Search remap      Detail remap
                     \                /
                      v              v
                Advanced + Alumni verification
                              |
                              v
          Fidelity, failure testing, preview, final gate
```

## Testing contract

| Layer | Required behavior |
|---|---|
| Projection unit | Always-public copy; protected copy/clear; eligibility unpublish; connected-record changes; idempotent reconciliation |
| Projection integration | Fellow edit and visibility transition propagate to exactly one public record |
| Public schema | Only allowlisted projection fields; no raw Fellow connection or protected fields |
| Route/build | Four directory roots emit; alumni alias redirects; duplicate remains excluded; article detail links remain valid |
| Browser | Basic, quoted search, no-results, load-more, complete/sparse/missing detail, Advanced, Alumni, return-state restoration |
| Accessibility | Keyboard, focus, labels, announcements, semantic results/profile content, alt text |
| Failure | Knack/API/Flow/embed failure, empty response, unknown slug, projection drift |
| Network/privacy | Exact host allowlist; public views use only projection objects; no response bodies persisted |
| Visual | Desktop/mobile comparisons with no overflow, broken images, or embed collisions |

## Definition of done

1. Knack remains the editable system of record.
2. Every eligible Fellow has exactly one current public projection.
3. Visibility changes clear protected public values before the next public response.
4. No unauthenticated view includes protected raw Fellow fields or a raw Fellow connection.
5. Basic Search and Fellow Detail use projection views and preserve current behavior.
6. Advanced and Alumni Search use projection-backed views and preserve current behavior.
7. Existing `/fellow-detail?fellow=...` links continue working.
8. EHF has written permission to commit and serve the Optimi code.
9. All verification passes and stakeholders approve the preview.
10. Custom-domain cutover occurs only after separate final authorization.

## Rollback

Before cutover, discard or revert the implementation branch; Squarespace remains live.

For Knack containment or projection changes, retain exported schemas, field maps, counts, and duplicated views. If a production public view fails, restore the previous view only if doing so does not reintroduce protected raw fields; otherwise retain the contained reduced-field view. Projection automation can be disabled without changing source Fellow records. No Fellow-data rollback is required because source records are not migrated.

## Stakeholder approval record

Implementation remains blocked until completed by authorized stakeholders:

- [ ] Immediate containment approved.
- [ ] Public projection architecture approved.
- [ ] Public-field allowlist approved.
- [ ] Optimi public-repository/site permission verified.
- [ ] Dynamic Knack dependency approved.
- [ ] Route and legacy-link contract approved.
- [ ] Knack implementation owner assigned.
- [ ] Fresh implementation branch authorized.

**Approved by:**

**Approval date:**

**Amendments:**
