# EHF Fellow Directory Static Clone Plan

**Status:** Planning only. Stakeholder approval required before implementation.

**Goal:** Replace the Squarespace and Knack Fellow Directory with a static, source-faithful Astro snapshot that preserves public search, filtering, Fellow profiles, alumni profiles, and existing inbound links without any runtime dependency on Knack.

**Architecture:** An owner-approved, privacy-safe export becomes the sole directory source. A strict allowlist validator rejects Knack field identifiers and undeclared data. Astro generates one canonical page per approved public profile, while compact browser-side indexes provide Basic Search and Advanced Search. A compatibility route preserves existing `/fellow-detail?fellow=...` links. Profile media is copied to EHF-controlled storage and referenced through the existing asset manifest contract.

**Tech stack:** Astro 7 static output, strict TypeScript, Zod schemas through Astro, Vitest, Playwright, `@axe-core/playwright`, and a small client-side search module. No database, server-rendered API, authentication, or Knack runtime.

---

## Authorization boundary

This document is the deliverable. Do not change route classifications, fetch or export Fellow records, download profile images, add dependencies, implement pages, deploy, or alter Squarespace/Knack until all stakeholder gates below are satisfied in writing.

Implementation may begin only after:

1. EHF confirms the Knack public-view privacy issue has been remediated.
2. The data owner supplies or approves a new export containing only fields approved for permanent public publication.
3. Stakeholders approve the route set, public-field contract, profile count, alumni treatment, and snapshot date.
4. The owner approves this exact plan and authorizes a fresh implementation branch.
5. The profile-image destination is decided under issue #6 or another explicitly approved storage decision. Do not add hundreds of profile images to Git while repository-size remediation is pending.

The current broadly exposed Knack API response must not be used as migration input. Client-side privacy flags, Knack `field_*` properties, account status, approval status, utility keys, internal record identifiers, and raw relationship objects must never enter the repository, generated site, test fixtures, logs, screenshots, or build artifacts.

## Verified source behavior

Verified against the public Squarespace pages on 2026-08-20:

| Surface | Current implementation | Observed behavior | Static-clone disposition |
|---|---|---|---|
| `/fellow-directory` | Squarespace HTML plus custom Optimi JavaScript | Downloads 514 current-Fellow records, searches locally with Fuse.js, shows 24 random records, loads 24 more per click | Rebuild as native Astro page with approved static index |
| `/fellow-directory-advanced-search` | Embedded Knack `dist_2`, scene `scene_340`, search view `view_649` | Name and faceted search; 100 records per page by default; six observed pages | Rebuild as native Astro page with static facets and pagination |
| `/alumni-directory-advanced-search` | Embedded Knack `dist_3`, scene `scene_399`, search view `view_728` | Four observed alumni rows and inline hash-based profile details | Rebuild as native Astro page over approved alumni snapshot |
| `/fellow-detail?fellow=<slug>` | Squarespace custom JavaScript querying the Knack public view by slug | Renders one Fellow profile and links back to directory/search state | Preserve as compatibility resolver; generate canonical profile pages |
| Profile images | Knack-managed S3 objects | Loaded directly from Knack asset URLs | Copy approved bytes to EHF-controlled storage; no hotlink dependency |

The current replacement repository explicitly excludes these routes in `source-evidence/route-manifest.json`. `src/data/site.ts` permits navigation only to included or redirected manifest routes, and `src/pages/[...page].astro` generates only existing institutional, legal, and snapshot families. Directory implementation must extend those contracts instead of bypassing them.

## Product scope

### Included

- Basic Search.
- Advanced Search.
- Alumni Fellows search.
- One static canonical detail page for every approved current Fellow and alumnus.
- Compatibility for existing `/fellow-detail?fellow=...` links embedded throughout archived articles.
- Desktop and mobile source-faithful layouts.
- Search state encoded in the URL so results can be shared and browser navigation works.
- Local or EHF-controlled copies of approved profile images.
- Snapshot date and archive notice visible on directory surfaces.
- Accessible keyboard, focus, form, table/list, image, and status behavior.

### Explicitly excluded

- Knack login, member-only data, editing, write APIs, or synchronization.
- Continuing updates after the approved snapshot.
- Private or conditionally hidden data not present in the approved export.
- Recreating Knack administration.
- Contact forms, messaging, recommendations, saved searches, analytics, or authentication.
- General asset-history remediation tracked by issue #6.
- Redesigning the directory beyond corrections required for accessibility and the existing Astro shell.

## Stakeholder defaults to approve or amend

These are the recommended defaults. A stakeholder may amend them before approval; implementation must not silently choose a different behavior.

1. **Snapshot:** one final approved export, permanently identified by UTC date and checksum; no refresh pipeline afterward.
2. **Route coverage:** Basic Search, Advanced Search, Alumni Fellows, canonical profile pages, and compatibility for old detail links.
3. **Canonical profile URL:** `/fellow-directory/<slug>/` for current Fellows and `/alumni-directory/<slug>/` for alumni.
4. **Old-link behavior:** `/fellow-detail?fellow=<legacy-slug>` performs a client-side lookup against a minimal slug map and replaces the location with the canonical static page; unknown slugs show a clear not-found state with a directory link.
5. **Default Basic Search ordering:** preserve source discovery behavior by shuffling approved current Fellows on each new page load; search results use relevance order; the URL preserves active search and displayed-count state.
6. **Advanced Search ordering:** name ascending unless a stakeholder requires the current Knack order.
7. **Alumni:** visually and semantically identified as alumni, stored separately from current Fellows, and excluded from Basic Search unless the user selects the Alumni surface.
8. **Images:** approved profile images copied to EHF-controlled versioned storage; missing images use the source-observed neutral placeholder.
9. **Sensitive candidate fields:** gender is excluded by default. Citizenship, location, pronouns, and Fellow type appear only when the approved public export explicitly contains them. Absence is represented by omission, never by a hidden raw value or privacy flag.
10. **Archive notice:** every directory surface states that it is a snapshot and names the snapshot date.

## Public data contract

The migration input must be a purpose-built public export, not a raw Knack response. Store the approved snapshot as one strict content entry and retain a separate signed-off field contract.

```ts
export type DirectorySnapshot = {
  schemaVersion: 1;
  capturedAt: string; // strict UTC ISO date
  source: 'stakeholder-approved-public-export';
  exportSha256: string; // 64 lowercase hex characters
  fellows: PublicProfile[];
  alumni: PublicProfile[];
};

export type PublicProfile = {
  slug: string;
  legacySlugs: string[];
  status: 'current' | 'alumni';
  name: string;
  aliases: string[];
  pronouns?: string;
  headline: string;
  profilePhoto?: {
    assetId: string;
    alt: string;
  };
  cohort?: {
    shortName?: string;
    longName?: string;
    maoriName?: string;
  };
  fellowTypes: string[];
  citizenships: string[];
  locations: string[];
  industries: string[];
  otherIndustries: string[];
  keySkills: string[];
  globalNetworks: string[];
  modesOfWorking: string[];
  worksThrough: string[];
  careerHighlights?: string;
  keyNetworks?: string;
  impactGoals?: string;
  ecosystemSupport?: string;
  supportRequested?: string;
  ventures: PublicLink[];
  sustainableDevelopmentGoals: PublicLink[];
  tags: string[];
};

export type PublicLink = {
  label: string;
  href: string;
};
```

Validation invariants:

- The schema is strict: unknown properties fail the build.
- No property name may match `field_*`, contain `raw`, or equal a known Knack/system key.
- Slugs are unique across current Fellows and alumni after legacy aliases are normalized.
- Every legacy slug maps to exactly one canonical profile.
- Every link uses `https:` unless it is an approved internal path.
- Every `assetId` resolves through the asset manifest and passes checksum verification.
- Arrays are deduplicated, trimmed, and deterministically sorted where order is not editorial.
- HTML is not accepted in plain-text fields. Rich text, if stakeholders prove it is required, must pass the existing allowlisted rich-text renderer rather than direct HTML injection.
- Empty optional values are omitted. Privacy controls and hidden source values are not represented.

## Static output and browser data

The build produces:

- one HTML page for `/fellow-directory`;
- one HTML page for `/fellow-directory-advanced-search`;
- one HTML page for `/alumni-directory-advanced-search`;
- one compatibility HTML page for `/fellow-detail`;
- one HTML page per canonical current-Fellow slug;
- one HTML page per canonical alumni slug;
- one compact current-Fellow search index;
- one compact alumni search index;
- one minimal legacy-slug-to-canonical-path map.

Search indexes contain only fields approved for searching. Detail-only prose not required for search stays in generated profile HTML and is not duplicated into the browser index. No page makes a request to `api.knack.com`, `loader.knack.com`, Knack renderer hosts, or Knack asset buckets.

### Basic Search behavior

- Search across name, aliases, headline, cohort names, Fellow type, industries, skills, networks, approved locations/citizenships, ventures, goals, and tags.
- Preserve quoted exact-match behavior.
- Use the source weighting: name and unstructured industry-other values receive higher weight than general fields.
- Show 24 results initially and add 24 per activation.
- Announce “Showing N of M fellows” through an accessible status region.
- Encode `search` and `numRecords` in the URL query rather than the source hash for standards-based navigation; accept the old hash form as compatibility input.
- Clearing search returns to the discovery set without reloading the page.

### Advanced Search behavior

Provide explicit controls for the source-observed filters:

- Name.
- Cohort.
- Fellow Type.
- Industries.
- Key Skills.
- Global Network/region.

Options are derived from the approved snapshot at build time, not hand-maintained. Multiple values within one facet use OR; different facets combine with AND. Search, reset, result count, page size, and pagination are keyboard accessible. Supported page sizes remain 10, 25, 50, 100, 500, and 1000, with 100 as the source default.

### Profile behavior

- Render all approved non-empty fields using semantic headings and lists.
- Preserve approved venture and Sustainable Development Goal links.
- Never render empty placeholder sections.
- Provide “Back to Directory” and “Find more fellows” links that restore compatible search state when present.
- Set canonical URL, title, description, and social metadata from the approved profile.
- Unknown canonical or legacy slugs return the existing static 404 behavior or the compatibility not-found state; never silently select a different Fellow.

## Route and manifest changes

Extend the route manifest with these template families:

```ts
type DirectoryTemplateFamily =
  | 'fellow-directory-basic'
  | 'fellow-directory-advanced'
  | 'alumni-directory-advanced'
  | 'fellow-profile'
  | 'alumni-profile'
  | 'fellow-detail-compatibility';
```

Required route dispositions:

| Path | New disposition |
|---|---|
| `/fellow-directory` | Included, Basic Search |
| `/fellow-directory-advanced-search` | Included, Advanced Search |
| `/alumni-directory-advanced-search` | Included, Alumni search |
| `/alumni-directory` | Permanent redirect to `/alumni-directory-advanced-search` |
| `/fellow-detail` | Included compatibility resolver |
| `/fellow-directory/<slug>` | Generated included current-Fellow profile |
| `/alumni-directory/<slug>` | Generated included alumni profile |
| `/copy-060421-exact-match-fellow-directory` | Remains excluded duplicate |

Update navigation through `src/data/site.ts`; do not hardcode unvalidated internal links in components. The desktop and mobile header gain `Fellow Directory` in the source-observed position, and directory subnavigation exposes Basic Search, Advanced Search, and Alumni Fellows.

## Exact implementation file map

| Path | Planned action |
|---|---|
| `source-evidence/route-manifest.json` | Reclassify approved directory roots and declare generated directory families |
| `source-evidence/source-contract.json` | Add desktop/mobile and interaction-state evidence for all directory surfaces |
| `source-evidence/content-manifest.json` | Add one approved directory snapshot input record |
| `source-evidence/asset-manifest.json` | Add approved profile-image records using the storage decision from issue #6 |
| `src/content.config.ts` | Add the strict single-entry directory snapshot schema |
| `src/content/fellow-directory/directory-snapshot.json` | Add only the stakeholder-approved sanitized snapshot |
| `src/lib/fellow-directory.ts` | Validate, normalize, index, and resolve canonical/legacy slugs |
| `src/lib/route-manifest.ts` | Admit the directory template families and generated profile routes |
| `src/data/site.ts` | Add manifest-validated Fellow Directory navigation |
| `src/pages/fellow-directory.astro` | Basic Search shell and snapshot notice |
| `src/pages/fellow-directory-advanced-search.astro` | Current-Fellow advanced search shell |
| `src/pages/alumni-directory-advanced-search.astro` | Alumni search shell |
| `src/pages/fellow-detail.astro` | Legacy query compatibility resolver and not-found state |
| `src/pages/fellow-directory/[slug].astro` | Static current-Fellow detail pages |
| `src/pages/alumni-directory/[slug].astro` | Static alumni detail pages |
| `src/components/directory/` | Directory menu, search controls, result cards/table, profile sections, and snapshot notice |
| `src/components/directory/DirectorySearch.astro` | Embed the approved compact JSON index and colocated browser-side Basic/faceted search script, following existing component-script conventions |
| `scripts/import-fellow-directory.mjs` | One-shot allowlisted importer for the approved export; no Knack network access |
| `scripts/verify-content.mjs` | Enforce snapshot count, schema, slug, route, link, and forbidden-key invariants |
| `scripts/verify-local-assets.mjs` | Verify every approved profile asset under the chosen storage contract |
| `tests/unit/fellow-directory.test.ts` | Schema, forbidden fields, slug aliases, facets, exact search, filtering, and pagination |
| `tests/e2e/fellow-directory.spec.ts` | Directory, search, profile, compatibility, accessibility, responsive, and no-Knack-network contracts |


## Execution sequence

### Ticket 0: Stakeholder and privacy gate

- [ ] Obtain written approval of this plan and the ten stakeholder defaults.
- [ ] Record the approved snapshot date, expected current-Fellow count, expected alumni count, and public-field list.
- [ ] Confirm the Knack privacy remediation is complete.
- [ ] Obtain the sanitized export and its SHA-256 checksum through an approved private transfer.
- [ ] Confirm the profile-image destination and ownership under issue #6.
- [ ] Stop if any field, record, image, count, or route remains disputed.

**Acceptance:** signed-off field contract, counts, checksum, route set, asset destination, and explicit implementation authorization. No repository data is imported in this ticket.

### Ticket 1: Source contract and failing data tests

- [ ] Capture source desktop/mobile states for Basic Search, Advanced Search, Alumni Fellows, a representative complete profile, a sparse profile, quoted search, no-results, load-more, multi-facet filtering, reset, pagination, and missing legacy slug.
- [ ] Add route and source-contract records without adding Fellow data.
- [ ] Write failing unit tests for the exact schema and forbidden-key rules.
- [ ] Write failing route tests for the new static families.

**Acceptance:** source states and failure-first contracts are complete; no privacy-sensitive export bytes are committed yet.

### Ticket 2: Sanitized snapshot and assets

- [ ] Run the one-shot importer only against the approved local export file.
- [ ] Map only approved fields into the strict schema and fail on every unknown key.
- [ ] Normalize and validate canonical and legacy slugs.
- [ ] Copy approved profile images to the selected EHF-controlled storage; verify hashes and media metadata.
- [ ] Compare imported counts and a stakeholder-selected sample against the approved export.
- [ ] Delete the private transfer file after the committed sanitized snapshot and asset verification are accepted.

**Acceptance:** exact approved counts, no forbidden keys, no unknown fields, unique slugs, all images verified, and stakeholder sample accepted.

### Ticket 3: Static profile routes and compatibility

- [ ] Implement current-Fellow and alumni static detail routes.
- [ ] Implement the `/fellow-detail` legacy resolver with exact alias matching and explicit unknown state.
- [ ] Update article-link validation so existing `/fellow-detail?...` links remain approved until canonical links are migrated.
- [ ] Add canonical metadata, directory return links, sparse-field omission, and snapshot notice.

**Acceptance:** one generated page per unique approved profile, all old known slugs resolve to exactly one canonical page, unknown slugs never resolve to a person, and profile pages make no Knack requests.

### Ticket 4: Basic Search

- [ ] Implement the compact approved search index and source-compatible weighting.
- [ ] Implement quoted exact search, fuzzy search, random discovery, 24-record increments, result count, URL state, and old-hash compatibility.
- [ ] Implement result cards with approved images, headline, accessible names, and canonical links.
- [ ] Verify keyboard behavior, focus, status announcements, no-results, and restored history state.

**Acceptance:** observed search contracts pass over the complete snapshot with no duplicates or missing approved records.

### Ticket 5: Advanced and alumni search

- [ ] Generate facet options from approved values.
- [ ] Implement current-Fellow advanced filtering, reset, count, page size, and pagination.
- [ ] Implement the same primitives over the separate alumni snapshot, without mixing result sets.
- [ ] Preserve the source directory menu and responsive behavior.

**Acceptance:** each facet and cross-facet combination returns the mathematically correct set; pagination has no duplicates or omissions; all four approved alumni records or the stakeholder-approved replacement count are reachable.

### Ticket 6: Navigation, source fidelity, and full verification

- [ ] Add manifest-validated header and footer navigation where the source requires it.
- [ ] Match source geometry and states at `1440x1000` and `390x844`, using the existing visual-review workflow.
- [ ] Run content, route, asset, unit, build, browser, accessibility, responsive, console, and network verification.
- [ ] Prove there are zero requests to Knack hosts on every directory surface.
- [ ] Produce a stakeholder preview; do not merge, deploy to the custom domain, or remove Squarespace/Knack until final acceptance.

**Acceptance:** all automated and browser checks pass; stakeholder preview matches the approved snapshot and source contract; final cutover remains separately authorized.

## Dependency graph

```text
Stakeholder approval + Knack privacy remediation + issue #6 storage decision
                              |
                              v
              Source contract and failing tests
                              |
                              v
                Sanitized snapshot and images
                              |
              +---------------+---------------+
              |                               |
              v                               v
     Static profile routes             Search data/indexes
              |                               |
              +---------------+---------------+
                              |
                              v
      Basic + Advanced + Alumni user interfaces
                              |
                              v
       Navigation, visual review, preview, final gate
```

The sanitized snapshot is the hard prerequisite: routes and search must consume the same validated records. Profile-image storage must be settled before import so this work does not deepen issue #6. Cutover is last because existing Squarespace and Knack remain the rollback until stakeholders accept the static preview.

## Testing contract

| Layer | Required behavior |
|---|---|
| Unit | Strict schema; forbidden keys; exact counts; canonical and legacy slug uniqueness; normalized facets; exact-quote parsing; fuzzy weighting; AND/OR facet logic; pagination boundaries |
| Content verification | Snapshot checksum/date; approved counts; no unknown fields; safe links; every asset ID resolves; every record emits one intended route |
| Route/build | All directory roots and generated profiles emit; duplicate copy remains excluded; old detail links remain valid; unmatched slugs fail closed |
| Browser | Basic search, quoted search, no-results, clear, load-more, URL restoration, advanced multi-filter, reset, page-size changes, pagination, alumni isolation, legacy redirect, sparse and complete profiles |
| Accessibility | Keyboard-only use, visible focus, associated labels, status announcements, semantic results, alt text, headings, table/list semantics, reduced motion |
| Network/security | Zero Knack hosts; zero unapproved third-party profile-media hosts; no private fields in HTML, JSON, JavaScript, source maps, fixtures, logs, or screenshots |
| Visual | Desktop/mobile default and interactive states compared with approved source evidence; no overflow or broken images |

## Definition of done

1. Stakeholders approve the public-field contract, snapshot date, counts, route set, alumni behavior, profile-media destination, and preview.
2. The build contains only the approved public snapshot and rejects every undeclared source property.
3. Every approved current Fellow and alumnus has exactly one canonical static profile page.
4. Every known legacy Fellow slug resolves to the intended canonical page; unknown slugs expose no record.
5. Basic, Advanced, and Alumni search operate entirely over static approved indexes and preserve shareable browser state.
6. All approved profile images are under EHF control and checksum verified.
7. No directory page or client bundle contacts Knack at runtime.
8. Existing archived article links to `/fellow-detail?fellow=...` remain functional.
9. Content, route, asset, unit, build, browser, accessibility, responsive, console, and network checks pass.
10. Squarespace/Knack cutover occurs only after a separate final stakeholder authorization.

## Rollback

Before cutover, rollback is to discard or revert the implementation branch; production remains unchanged. During preview, Squarespace and Knack continue serving the live directory.

At cutover, preserve the last accepted Squarespace/Knack URLs and deployment configuration until the static directory is verified on the custom domain. If a material data, route, image, or search defect appears, restore the previous domain/deployment routing. Because the approved snapshot and checksums are immutable, correction must produce a newly approved snapshot version rather than mutating the accepted one silently.

## Stakeholder approval record

Implementation remains blocked until this section is completed by or on behalf of the authorized stakeholders:

- [ ] Plan approved without amendments, or amendments recorded below.
- [ ] Public-field contract approved.
- [ ] Current-Fellow and alumni counts approved.
- [ ] Snapshot date and checksum approved.
- [ ] Route and legacy-link behavior approved.
- [ ] Asset-storage decision approved.
- [ ] Implementation authorized on a fresh branch.

**Approved by:**

**Approval date:**

**Amendments:**
