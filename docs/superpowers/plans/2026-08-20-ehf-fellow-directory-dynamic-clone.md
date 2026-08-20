# EHF Fellow Directory Dynamic Clone Plan

**Status:** Planning only. Stakeholder approval required before implementation.

**Goal:** Move the live Fellow Directory from the Squarespace shell into the Astro site while preserving Knack as the editable system of record and retaining the existing directory behavior.

**Architecture:** Reuse the current EHF-licensed Optimi JavaScript for Basic Search and Fellow Detail with the same Knack public view. Retain the current Knack `dist_2` Advanced Search and `dist_3` Alumni embeds. Replace only the Squarespace page shell, styling hooks, navigation integration, and deployment host. Do not add a proxy, synchronization service, second database, static Fellow snapshot, or new search implementation.

**Tech stack:** Astro 7 static site shell, the existing browser-side Optimi directory code, its existing jQuery/Fuse/lazy-image dependencies, Knack application `63306ddbdfad5247a024eac3`, and the current Knack embeds. Vitest, Playwright, and `@axe-core/playwright` verify the integration.

---

## Decision and rationale

Fellows must continue updating their own profiles in Knack. The current integration already provides that behavior:

- Basic Search loads the public Knack view and searches it in the browser.
- Fellow Detail loads one current record from the same view.
- Advanced Search is rendered by Knack `dist_2`.
- Alumni Fellows is rendered by Knack `dist_3`.
- Profile images are served from Knack-managed storage and change with the Knack record.

A scheduled export, server proxy, cache, static snapshot, generated profile pages, and EHF-owned copy of profile media would duplicate working Knack behavior and create new synchronization and operational failure modes. They are not part of this plan.

## Authorization boundary

This document is the deliverable. Do not copy licensed Optimi source into the repository, change route classifications, add dependencies, implement pages, change Knack, deploy, or alter Squarespace until all gates below are satisfied in writing.

Implementation may begin only after:

1. EHF confirms the Knack public-view privacy configuration is corrected and retested.
2. EHF confirms in writing that the Optimi license permits the directory code to be copied into and served from the public `ehfarchive/ehf.org` repository and replacement site.
3. Stakeholders approve preserving the current browser-to-Knack architecture, including Knack as a live production dependency.
4. Stakeholders approve the exact route set and source-fidelity contract.
5. The owner approves this revised plan and authorizes a fresh implementation branch.

If Optimi permission is absent or narrower than required, stop. Do not reimplement the licensed behavior under this plan; return to stakeholders for a separate clean-room design decision.

## Verified current architecture

Verified against the public Squarespace pages on 2026-08-20:

| Surface | Current implementation | Data flow | Planned treatment |
|---|---|---|---|
| `/fellow-directory` | Squarespace HTML plus approximately 22 KB of Optimi JavaScript | Direct browser GET to Knack `scene_161` / `view_490`; Fuse.js searches all returned records; 24 random records initially and 24 more per activation | Preserve the DOM and JavaScript behavior inside an Astro page |
| `/fellow-detail?fellow=<slug>` | Squarespace HTML plus approximately 29 KB of Optimi JavaScript | Direct browser GET to the same view filtered by `field_288`; renders the matching record | Preserve the query/hash contract and JavaScript behavior inside an Astro page |
| `/fellow-directory-advanced-search` | Knack embed `dist_2`, scene `scene_340`, search view `view_649` | Knack renders and operates the complete search interface | Preserve the embed inside the Astro shell |
| `/alumni-directory-advanced-search` | Knack embed `dist_3`, scene `scene_399`, search view `view_728` | Knack renders and operates alumni search and inline details | Preserve the embed inside the Astro shell |
| Profile images | Knack-managed asset storage | URLs arrive with live Knack records | Continue using Knack-managed URLs |

The existing Astro replacement deliberately excludes all directory routes in `source-evidence/route-manifest.json`. `src/data/site.ts` admits only manifest-approved navigation. The implementation must extend these contracts rather than bypassing them.

## What remains unchanged

- Knack remains the only Fellow-data store.
- Fellows continue editing records through the existing Knack workflows.
- Knack field identifiers and view IDs remain authoritative.
- Existing privacy-setting logic remains as defense in depth after the Knack view itself is corrected.
- Basic Search keeps the current weighted Fuse.js behavior, exact-quote behavior, random discovery, result count, and 24-record load increments.
- Fellow Detail keeps the current `?fellow=<slug>` query and directory search-state hash.
- Advanced Search keeps the existing Knack facets, sorting, pagination, and rendering.
- Alumni Fellows keeps the existing Knack search and inline detail behavior.
- Profile images continue to update through Knack.
- Existing archived article links to `/fellow-detail?...` remain unchanged.

## What changes

- Squarespace page HTML becomes Astro components and routes.
- Squarespace-specific global injection is replaced by explicit route/component dependencies.
- Directory styling moves into the repository using the source-observed selectors and geometry.
- Header, footer, and directory subnavigation use the manifest-validated Astro shell.
- The licensed scripts become versioned project source only after permission is confirmed.
- Runtime host access is declared explicitly through the deployment security policy.
- Automated tests cover the live integration and fail if Knack or field contracts drift.

## Route contract

Extend the route manifest with these included families:

```ts
type DirectoryTemplateFamily =
  | 'fellow-directory-basic'
  | 'fellow-detail'
  | 'fellow-directory-advanced'
  | 'alumni-directory-advanced';
```

Required dispositions:

| Path | Disposition |
|---|---|
| `/fellow-directory` | Included, Basic Search |
| `/fellow-detail` | Included, current query/hash-based detail page |
| `/fellow-directory-advanced-search` | Included, Knack `dist_2` embed |
| `/alumni-directory-advanced-search` | Included, Knack `dist_3` embed |
| `/alumni-directory` | Permanent redirect to `/alumni-directory-advanced-search` |
| `/copy-060421-exact-match-fellow-directory` | Remains excluded as a duplicate |

Do not generate per-Fellow static routes. Do not rewrite article links to a new canonical profile URL.

## Existing code reuse contract

### Basic Search

Preserve the current:

- Knack application ID and public-view request contract.
- `scene_161` / `view_490` endpoint.
- `rows_per_page=1000` single-request behavior.
- weighted search fields and dynamic `minMatchCharLength`.
- quoted exact-match search.
- search/hash restoration.
- random default result selection.
- 24-result initial display and load-more increments.
- lazy profile-image behavior.
- privacy-setting checks.
- card and detail-link formatting.
- loading, no-results, and request-error states.

Only adapt:

- selectors that currently depend on Squarespace-generated block IDs;
- DOM creation to stable `data-*` hooks owned by Astro components;
- dependency imports so the route does not rely on unrelated Squarespace global injection;
- source styling hooks required to match the approved Astro shell;
- error text if stakeholders approve a wording correction.

Do not rewrite the search algorithm or replace Fuse.js as part of the migration.

### Fellow Detail

Preserve the current:

- `fellow` query parsing.
- `field_288` exact filter.
- directory search-state hash.
- public-field mapping.
- privacy-setting checks.
- empty-field section removal.
- links for ventures and Sustainable Development Goals.
- profile-image behavior.
- loading, absent-record, and request-error states.
- “Find more fellows” and “Back to Directory” behavior.

Replace Squarespace-generated block IDs with stable Astro-owned hooks through one explicit selector map. Do not change the Knack field map while migrating.

### Advanced Search

Preserve:

```html
<script>
  app_id = "63306ddbdfad5247a024eac3";
  distribution_key = "dist_2";
</script>
<script src="https://loader.knack.com/63306ddbdfad5247a024eac3/dist_2/knack.js"></script>
```

The Astro page supplies the source-observed directory heading, subnavigation, embed container, loading state, and spacing. Knack continues rendering the search form and results.

### Alumni Fellows

Preserve the same integration with `distribution_key = "dist_3"`. Knack continues rendering alumni search, rows, and hash-based inline detail views.

## Privacy and trust boundary

The browser will continue receiving the public Knack response. Therefore the Knack public view is the primary access-control boundary.

Before migration:

1. Correct `view_490` so fields not authorized for `Public directory` are absent from the response.
2. Verify the correction with records whose citizenship, location, gender, and Fellow type settings are off.
3. Confirm the visible Squarespace page still renders every authorized field after the view correction.
4. Confirm Basic Search and Fellow Detail tolerate omitted protected fields.
5. Repeat the same field-level review for the Advanced Search and Alumni distributions.

The client-side deletion logic remains in place as defense in depth, but acceptance requires the prohibited raw values to be absent from the network response before client code runs.

Tests and committed evidence must not contain copied production Fellow records. Unit tests use synthetic records with invented names and values. Live browser checks may confirm element presence and behavior for stakeholder-approved public profiles but must not serialize response bodies into artifacts or logs.

## Dependency and licensing contract

Inventory the exact current dependencies before copying code:

- jQuery versions currently loaded by Squarespace.
- `jquery.lazy` version.
- Fuse.js version.
- line-clamping helper embedded in the current injection.
- any Soluntech helper used by the Knack embeds.
- Squarespace CSS classes referenced by the directory scripts.

Use one compatible jQuery version unless the existing code demonstrably requires two. This is dependency deduplication, not a behavioral rewrite. Pin every copied or externally loaded version. Preserve required copyright and license notices.

The Optimi header states that the directory code is licensed for EHF and may not be reused or posted without written permission. Because this repository is public, written permission is a hard prerequisite to committing the source. Record the permission location privately; commit only a non-sensitive statement that permission was confirmed.

## Runtime host policy

The deployed directory must permit only the required hosts:

- `api.knack.com` for Basic Search and Fellow Detail.
- `loader.knack.com` for Advanced and Alumni embeds.
- the Knack regional renderer read/write hosts required by the embeds.
- Knack-managed profile asset hosts.
- explicitly retained dependency CDNs, if dependencies are not bundled locally.

Do not add wildcard network permissions when exact hosts work. Browser tests must fail on any unexpected directory request host.

Knack is an intentional live dependency. The page must show the existing clear error state when Knack is unavailable; it must not silently display stale or partial Fellow data.

## Exact implementation file map

| Path | Planned action |
|---|---|
| `source-evidence/route-manifest.json` | Reclassify directory roots and the alumni redirect |
| `source-evidence/source-contract.json` | Add desktop/mobile/default/loading/search/error/detail/embed states |
| `src/lib/route-manifest.ts` | Add four directory template families |
| `src/data/site.ts` | Add manifest-validated Fellow Directory navigation |
| `src/pages/fellow-directory.astro` | Basic Search route |
| `src/pages/fellow-detail.astro` | Query/hash-based Fellow Detail route |
| `src/pages/fellow-directory-advanced-search.astro` | Knack `dist_2` route |
| `src/pages/alumni-directory-advanced-search.astro` | Knack `dist_3` route |
| `src/components/directory/DirectoryMenu.astro` | Basic, Advanced, and Alumni subnavigation |
| `src/components/directory/BasicDirectory.astro` | Stable DOM contract for the licensed Basic Search code |
| `src/components/directory/FellowDetail.astro` | Stable DOM contract for the licensed Fellow Detail code |
| `src/components/directory/KnackEmbed.astro` | Shared explicit loader for `dist_2` and `dist_3` |
| `src/components/directory/basic-directory.ts` | Authorized, minimally adapted Optimi Basic Search code |
| `src/components/directory/fellow-detail.ts` | Authorized, minimally adapted Optimi Fellow Detail code |
| `src/styles/templates.css` | Directory-specific source-observed styles |
| `vercel.json` | Exact required Content Security Policy/network declarations if deployment needs them |
| `tests/unit/directory-contract.test.ts` | Hash/query, selector map, field map, privacy omission, and dependency contracts |
| `tests/e2e/fellow-directory.spec.ts` | Basic, detail, advanced, alumni, responsive, accessibility, failure, and network behavior |

Do not create a Fellow-data content collection, importer, synchronization job, API proxy, cache, generated search index, or profile-image downloader.

## Execution sequence

### Ticket 0: Stakeholder, privacy, and license gates

- [ ] Confirm written stakeholder approval of this plan.
- [ ] Confirm the four route dispositions.
- [ ] Confirm the corrected Knack field-level response contract.
- [ ] Confirm the Advanced and Alumni distributions expose only approved data.
- [ ] Confirm written Optimi permission for use in the public repository and replacement EHF site.
- [ ] Authorize a fresh implementation branch.

**Acceptance:** all confirmations are written and no gate is disputed. No code is copied or implemented in this ticket.

### Ticket 1: Source and dependency contract

- [ ] Capture source desktop/mobile states for Basic default, search, exact quote, no results, load more, loading, request error, complete detail, sparse detail, missing detail, Advanced default/results, Alumni default/results/detail, and directory subnavigation.
- [ ] Inventory the exact script dependencies, versions, licenses, network hosts, field map, and selectors.
- [ ] Add route/source-contract records without copying Fellow response data.
- [ ] Write failing synthetic unit and route tests.

**Acceptance:** complete source and runtime contract with no production record bodies in the repository.

### Ticket 2: Astro shells and routes

- [ ] Implement the four manifest-backed routes and shared directory menu.
- [ ] Reproduce the source DOM with stable semantic hooks.
- [ ] Add manifest-validated primary navigation.
- [ ] Implement the Advanced and Alumni Knack embed loader without changing Knack behavior.
- [ ] Verify the Astro shell does not interfere with Knack hash routing or embedded styles.

**Acceptance:** routes render their loading shells and embeds; implementation tests fail only because Basic/Detail licensed behavior has not yet been integrated.

### Ticket 3: Basic Search integration

- [ ] Copy the authorized Optimi source with notices intact.
- [ ] Replace Squarespace-generated selectors with the stable Basic Directory hooks.
- [ ] Pin and load the exact required dependencies.
- [ ] Preserve the existing Knack request, search, hash, randomization, pagination, image, privacy, and error behavior.
- [ ] Compare results against the live Squarespace page using the same searches without recording record bodies.

**Acceptance:** source-observed Basic Search states and synthetic contracts pass; network response contains no fields disabled by the tested privacy settings.

### Ticket 4: Fellow Detail integration

- [ ] Copy the authorized Fellow Detail source with notices intact.
- [ ] Replace Squarespace-generated selectors with the explicit detail selector map.
- [ ] Preserve query/hash parsing, exact slug lookup, field rendering, links, privacy checks, image behavior, and errors.
- [ ] Verify existing archived article links open the intended profiles and preserve return state.

**Acceptance:** representative complete, sparse, absent, and back-navigation states match the source contract without exposing omitted fields.

### Ticket 5: Fidelity, accessibility, failure, and integration verification

- [ ] Match approved desktop/mobile geometry and interaction states.
- [ ] Verify keyboard, focus, labels, result announcements, link semantics, image alternatives, and reduced motion.
- [ ] Simulate Knack API failure, embed-loader failure, empty response, omitted optional fields, and unknown Fellow slug.
- [ ] Assert exact allowed network hosts and zero unexpected requests.
- [ ] Run unit, route, content, asset, build, browser, accessibility, responsive, console, and network checks.
- [ ] Produce a stakeholder preview without changing the custom domain.

**Acceptance:** all checks pass and stakeholders accept the preview. Production cutover remains separately authorized.

## Dependency graph

```text
Stakeholder approval + Knack privacy correction + Optimi permission
                              |
                              v
                 Source/dependency contract
                              |
                              v
                    Astro routes and shells
                     /                \
                    v                  v
          Basic Search reuse    Fellow Detail reuse
                     \                /
                      v              v
                  Advanced + Alumni embeds
                              |
                              v
          Fidelity, failure testing, preview, final gate
```

The privacy and license gates precede all code copying. The route shells precede licensed integration so the scripts adapt once to a stable DOM. Basic and Detail are independent after that shared contract. Full verification comes last because all four surfaces share navigation, styling, Knack runtime access, and deployment policy.

## Testing contract

| Layer | Required behavior |
|---|---|
| Unit | Query/hash parsing, search options, exact quotes, result increments, selector map, field map, omitted protected fields, empty fields, dependency versions |
| Route/build | All four directory roots emit; alumni alias redirects; duplicate copy stays excluded; article detail links remain valid |
| Browser | Basic default/search/quote/no-results/load-more; complete/sparse/missing detail; Advanced search; Alumni search/detail; return-state restoration |
| Accessibility | Keyboard-only operation, visible focus, associated controls, status announcements, semantic result/profile content, alt text |
| Failure | API rejection, timeout, malformed/empty response, omitted optional fields, embed-loader failure, unknown slug |
| Network/privacy | Exact host allowlist; protected values absent from network responses when their Public directory settings are off; no response bodies persisted |
| Visual | Desktop/mobile source comparisons with no overflow, broken images, or shell/embed collisions |

## Definition of done

1. Knack remains the editable source of truth and Fellow updates continue appearing through the existing integration.
2. EHF has written permission to commit and serve the licensed Optimi directory code.
3. Basic Search behavior matches the current public page.
4. Existing `/fellow-detail?fellow=...` links continue working.
5. Advanced Search remains the working `dist_2` Knack experience.
6. Alumni Fellows remains the working `dist_3` Knack experience.
7. The corrected Knack public views omit values whose Public directory settings are off.
8. Client privacy checks remain as defense in depth.
9. No sync job, proxy, second database, static snapshot, or duplicate profile-media store is introduced.
10. All planned verification passes and stakeholders approve the preview.
11. Custom-domain cutover occurs only after a separate final authorization.

## Rollback

Before cutover, revert or discard the implementation branch; Squarespace continues serving the directory.

During cutover, retain the Squarespace configuration until all four Astro directory routes are verified on the custom domain. If Basic, Detail, Advanced, Alumni, privacy, or Knack network behavior fails materially, restore the prior routing to Squarespace. No Fellow-data rollback is required because Knack is never migrated or modified by the site implementation.

## Stakeholder approval record

Implementation remains blocked until this section is completed by or on behalf of the authorized stakeholders:

- [ ] Dynamic browser-to-Knack architecture approved.
- [ ] Basic and Fellow Detail code reuse approved.
- [ ] Advanced `dist_2` and Alumni `dist_3` embeds approved.
- [ ] Knack public-view privacy correction verified.
- [ ] Optimi public-repository/site permission verified.
- [ ] Route and legacy-link contract approved.
- [ ] Knack runtime dependency and failure behavior approved.
- [ ] Implementation authorized on a fresh branch.

**Approved by:**

**Approval date:**

**Amendments:**
