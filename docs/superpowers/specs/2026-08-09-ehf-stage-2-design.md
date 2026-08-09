# EHF Stage 2 Design

**Status:** Owner-approved Stage 2 design.
**Date:** 2026-08-09
**Authoring runtime:** `openai-codex/gpt-5.6-terra`
**Decision owner and spending owner:** EHF Archive owner
**Authority:** This document records the approved Stage 2 scope and operating rules. It authorizes detailed implementation planning only after the owner has reviewed this written specification. It does not authorize implementation, source capture, asset download, package work, deployment, push, pull-request change, or a domain change. Implementation requires an owner-approved detailed plan after Stage 1 is merged.

## Purpose and governing documents

Stage 2 will extend the completed Astro spike into a faithful, static recreation of the approved current public EHF site. The result must preserve the current site's public content, visual identity, responsive behavior, navigation, and meaningful interactions without Squarespace runtime dependencies or an invented redesign.

`AGENTS.md` remains the authority for project purpose, source fidelity, exclusions, quality bar, and working rules. `PLAN.md` remains the implementation baseline for Astro, TypeScript, content collections, local assets, accessibility, and verification. The approved Stage 1 design and `SPIKE-RESULTS.md` remain the evidence for the existing four-route spike. This design resolves the Stage 2 scope decisions that were previously open. If the live site, these documents, and this design conflict, stop the affected work, preserve the evidence, and obtain a written owner decision before changing the detailed plan.

## Scope manifest and canonical route policy

The detailed plan must produce one versioned route manifest before page work begins. Every discovered path is classified as exactly one of: `included`, `redirect`, `external`, or `excluded`. An unclassified path is a blocking error, not a reason to infer inclusion.

### Included public experience

The manifest includes the following genuine EHF public route families, subject to capture and one assigned template family per path:

- `/` as the only canonical homepage;
- Impact in Action listing, deterministic static pagination, and genuine public Impact articles;
- News listing, deterministic static pagination, and genuine public News articles;
- genuine public event and programme pages;
- annual-report pages and their approved document destinations;
- genuine institutional pages, including public history, values, and other current EHF information pages;
- public contact, media, and donation presentation pages;
- public privacy, terms, and other legal pages; and
- one intentional site 404 page.

The spike routes remain included and must be reused rather than rebuilt: `/`, `/read`, `/read/how-chemergy-is-changing-the-game-in-waste-to-energy`, and `/23-annual-report`.

### Redirects

Redirects are static, explicit manifest records with a source path, canonical destination, reason, and verification result. They do not render duplicate content.

- `/` is the canonical homepage.
- `/homepage` redirects permanently to `/`.
- `/impact-in-action` redirects permanently to `/read` when it is a legacy listing alias.
- `/archive` redirects permanently to `/read` when it is a legacy listing alias.
- Each of the 31 identified monthly archive paths redirects permanently to its assigned canonical archive listing route. The manifest records the exact source path and target; no monthly archive page is recreated as a separate template or duplicate content route.
- A legacy path is redirected only where the approved manifest identifies it as an alias. It is not used as a catch-all rule that could hide a malformed or excluded path.

### Exclusions

The manifest excludes and never generates, redirects by default, links to, captures, migrates, or localizes material solely for:

- every Fellow Directory, alumni directory, advanced-search, fellow-detail, directory-data, and iframe-backed directory surface;
- placeholder fellow drafts;
- malformed, stale, duplicate, test, staging, obsolete, and otherwise non-current paths;
- all 88 `/watch` hash variants, which are mangled variants rather than 88 public posts;
- stale templates; and
- every Hillary Institute page.

An excluded path may receive the intentional site 404 only when it is not an approved legacy alias. No excluded page is silently redirected to a plausible included page.

## Content, assets, and external-service decisions

All content is static build input. The browser must not fetch source content, Squarespace HTML, Squarespace CSS, Squarespace JavaScript, or Squarespace-hosted production assets at runtime.

Assets required by manifest-included pages are local build inputs. Actual external services, including video, social destinations, and donation controls, remain external destinations. The scope manifest determines the included inputs and external destinations.

Newsletter, contact, and media forms are display-only presentations unless the owner later approves a specific endpoint and a separate implementation plan. A display-only form must not send data, show a success state, or imply submission. Donation controls remain external destinations; Stage 2 does not implement payment, donation processing, authentication, commerce, analytics, or a form backend.

## Architecture and data flow

Stage 2 reuses the accepted Astro spike and its shared primitives. It does not replace the stack or recreate Squarespace-generated markup.

1. The route manifest classifies the approved current public site and makes inclusion, redirects, external destinations, and exclusions machine-readable.
2. Captured desktop and mobile source evidence supplies the accepted visual, interaction, copy, and link contract for each included template family.
3. Typed content collections hold repeatable Impact, News, and event content. Typed local page data holds institutional, legal, report, and presentation-page content. Every entry maps back to the route and content manifests.
4. The strict local asset resolver accepts only manifest-backed local files. It rejects missing files, hash mismatches, and source-host runtime references.
5. Astro generates static pages from the manifest, typed content, local data, shared site shell, and distinct page templates. Client-side code is limited to source-observed behavior such as navigation state and accessible controls.
6. Route, asset, link, accessibility, console, and visual checks validate generated output against the manifest and captured source states.

Template families are deliberately distinct where the content and source presentation differ: homepage; Impact listing and article; News listing and article; event/programme; annual report/document; standard institutional; contact/media/donation presentation; legal; and 404. They share measured design tokens, layout primitives, header, desktop navigation, mobile navigation, footer, and accessibility behavior. A generic catch-all route may render only a manifest-approved path assigned to a specific template family; it must not make arbitrary content files public.

## Failure behavior and quality gates

The implementation fails closed. It must stop rather than substitute, omit silently, or ship a weakened result when it encounters:

- an unclassified route, a route with more than one classification, or a redirect without an approved canonical target;
- an unsupported source block, unknown content structure, or a template requirement not covered by captured evidence;
- a missing or mismatched asset;
- a broken included internal link, a rendered link to an excluded directory route, or an unexpected Squarespace runtime reference;
- an accessibility failure, keyboard failure, unexpected browser-console error, or failed route response; or
- any P0, P1, or P2 visual defect at an agreed source viewport and interaction state.

P0 means a page or primary interaction is unusable. P1 means a major section, asset, state, or layout is missing. P2 means a visible typography, spacing, crop, color, or responsive mismatch. P3 is minor polish and may remain only when it is documented with its route, viewport, state, evidence, and owner approval in the final handoff. A passing build does not override a missing source, route, accessibility, link, console, or visual gate.

## Milestones and outcome tickets

The detailed plan will contain 12 outcome tickets, within the approved 10–14-ticket limit. Tickets have one owner, bounded files or read-only inputs, acceptance evidence, a stop condition, and one ledger entry. There are no commit-only tickets, duplicate reviews, or repeated full-suite runs. Each milestone has one designated verification owner and one batched review of the tickets it changes.

1. **Stage 1 merge and Stage 2 intake:** merge the approved Stage 1 PR into its target branch; create the implementation branch from that merge; confirm scope, billing, and preview gates before implementation.
2. **Route and source contract:** classify every candidate route; capture the included desktop, mobile, and interaction-state evidence; record the canonical aliases, 31 monthly redirects, and exclusions.
3. **Content and asset inputs:** normalize included content into typed inputs; record manifest-backed local assets and external destinations; block missing or mismatched assets and unsupported source blocks.
4. **Shared site foundation:** extend the accepted Astro shell, navigation, footer, measured tokens, local asset resolver, and manifest validation without changing the approved scope.
5. **Homepage and shared presentation:** complete the canonical homepage and source-observed shared interactions at required responsive states.
6. **Impact family:** complete the Impact listing, pagination, and genuine article routes using deterministic content ordering.
7. **News family:** complete the News listing, pagination, and genuine article routes using deterministic content ordering.
8. **Events, programmes, and reports:** complete approved event/programme and annual-report/document templates with manifest-backed local or clearly external documents.
9. **Institutional and legal family:** complete approved institutional and legal routes through their assigned templates.
10. **Contact, media, and donation presentation:** complete the explicit display-only forms and external donation behavior without a backend.
11. **Integrity and accessibility gate:** verify routes, redirects, assets, local-only runtime output, internal links, keyboard paths, accessibility, and console behavior.
12. **Blocking visual QA and handoff:** compare source and implementation at matching states; resolve P0–P2; document allowed P3 findings and the final route, content, and asset manifest state.

Milestones 2–3 complete before Milestones 4–10 consume their inputs. After those prerequisites, bounded template work may proceed concurrently only within the three-agent total cap and explicit file ownership. Milestones 11–12 are blocking integration gates after template work; they are not parallel duplicate test passes.

## Planning range and assumptions

The approved planning range is **45–90 aggregate agent-hours** and **4–10 calendar days**, with a six-day base case. This is a planning range, not a commitment or a per-route estimate. It assumes the accepted Astro spike is reused, the approved scope remains fixed, no new template family is discovered, source decisions arrive when needed, existing approved provider capacity is available, at most three agents run at once, and one final blocking visual/link/accessibility gate is used.

The range excludes time waiting for owner decisions, provider usage evidence, rate limits, billing anomalies, account access, source-site conflicts, an expanded archive, production form work, a new template family, or any scope change. Any of those conditions pauses the affected work and requires owner re-planning rather than silently extending this estimate.

## Roles, accountability, and operating limits

| Role | Required route | Owns | Must not do |
| --- | --- | --- | --- |
| BuildLead | `openai-codex/gpt-5.6-terra` | technical planning, Astro integration, route and data contracts, final acceptance, and its own accepted commits | delegate final integration to a commit-only agent or substitute another runtime |
| VisualDesigner | `anthropic/claude-opus-5` | reviewer and visual decision-maker: classify source/implementation differences and, under a bounded presentational sublease, prescribe or make one CSS correction | mechanically operate the browser, produce capture bundles, change route/content/test/billing/deployment contracts, or edit outside its sublease |
| ContentAssets | `openrouter/deepseek/deepseek-v4-flash-0731` | bounded source classification support, content preparation, asset-manifest, link/metadata checks, and, when assigned, mechanical visual-evidence production | decide scope, visual acceptance, or billing policy; edit shared application code |
| EHF Archive owner | owner-selected human authority | written gates, scope decisions, spending ownership, usage reading, and exception decisions | infer approval from progress, a green build, or a recommendation |

At most three agents run concurrently in total, including BuildLead. Work stays in the current OMP workspace routes only. An unavailable role stops its assigned work; there is no automatic fallback, provider switch, or model substitution. Each handoff is accepted only when its route, manifest entry, and acceptance evidence agree.

## Visual-review efficiency protocol

VisualDesigner is the visual reviewer and decision-maker, not the mechanical browser operator. For each template review, BuildLead or ContentAssets produces one compact evidence bundle before the designer is invoked. The bundle contains matching source and local screenshots, measured geometry, masked pixel-difference metrics, console and network results, a contact sheet, and suspected P0–P3 differences. Mechanical production may be delegated between BuildLead and ContentAssets, but P0–P3 classification, acceptance/blocking, and visual refinement remain VisualDesigner-exclusive.

VisualDesigner receives a fresh, narrow review context, inspects the bundle, and either accepts or blocks it, or makes/prescribes one bounded CSS correction. The evidence producer regenerates one comparison after that correction; VisualDesigner then accepts or blocks. This is one correction/recheck cycle, not an iterative recovery session. Do not wake a long-running designer session, poll a designer session, or ask it to operate browser tooling mechanically. Run browser capture once per complete state matrix and image analysis once per bundle.

The ordinary-template cap is eight Opus calls, with a warning at six. The complex shell/homepage cap is twelve, with a warning at ten. At the cap, return a structured blocker containing ticket, route/state, evidence-bundle paths, classified defects, calls used/cap, the raw terminal event if one exists, and the requested owner decision; do not automatically recover or start a new designer session. Before any retry of a failed designer task, inspect the raw terminal event. The first 429 immediately stops new model dispatches under the billing stop rule.

The operating target for the remaining work is five to eight visual-model calls per ordinary template, eight to twelve for a complex template, and approximately 50 to 80 calls total. These are usage and cost-management goals, not quality allowances: P0, P1, and P2 defects must never be accepted to meet a target. Hard-cap exhaustion blocks and escalates; it does not lower the visual gate.

This protocol responds to the observed baseline: Ticket 2 used 49 calls/$5.350945, Ticket 4 used 113/$11.3442855, and Ticket 5 used 235/$23.808267, totalling 397 calls/$40.5034975. The principal driver was 47,363,965 cache-read tokens. Those summed token figures are repeated per request, not unique-token consumption; the protocol reduces repeated browser and visual-analysis work rather than claiming a cost guarantee.

## Billing, usage ledger, and stop rules

Stage 2 has a **$0 incremental provider-spend cap**. This is an operating limit, not a claim that a provider is free or that existing subscriptions and credits have a dollar value. Work may use only existing approved credits or subscriptions. It must not add a paid plan, top up credits, upgrade a plan, enable overage, use a fallback provider, or switch provider/model route.

The EHF Archive owner is both spending owner and the person who reads the authoritative provider usage evidence. Before the first ticket, the owner must be able to read usage and remaining capacity for every approved route. The ledger has one row per ticket and records: date, ticket, role and exact model route, provider billing surface, session or request identifier when available, observed usage units or credits, observed charge when available, cumulative observed usage or charge, remaining approved capacity, and any rate-limit or billing event.

Stop all new model dispatches immediately at the first 429, paid-overage signal, unavailable required usage evidence, cap anomaly, unexpected billing notification, or other billing anomaly. Preserve the provider response and ledger state, then wait for the owner's written decision. No retry storm, top-up, upgrade, paid fallback, or provider switch is permitted.

## Branch, pull-request, preview, and rollback strategy

This design changes no remote state. The existing Stage 1 PR remains open and its remote head remains unchanged while this design is reviewed.
The local `feature/ehf-stage-2` branch carrying this design is documentation-only and has no implementation authority. The detailed plan must name a separate implementation branch created after the Stage 1 merge.

Before implementation, the approved Stage 1 PR must be merged into its intended target branch. The Stage 2 implementation branch is then created from that exact merge commit; it is not built on an unmerged Stage 1 branch or used to alter the Stage 1 PR. Stage 2 work is reviewed through its own pull request. No implementation commit is pushed, merged, or used to alter a deployment until the detailed plan is owner-approved and its relevant gates pass.

During authorized Stage 2 work, a Vercel branch preview may be used only as a branch preview for the Stage 2 implementation branch. It is not a production release, does not change a custom domain, and does not advance the production/default branch. This design makes no Hobby-plan, eligibility, billing, or $0-hosting claim. Any deployment requires the separately recorded readiness and account gates.

Rollback is simple and evidence-preserving: stop the affected ticket, retain the manifests and comparison evidence, and correct only through the Stage 2 branch and its review. If a preview is wrong, disable or withhold that preview through the approved deployment process; do not change the domain or merge a branch to repair it. A route, billing, or source conflict returns the project to the prior accepted milestone until the owner supplies a written decision.

## Definition of done and acceptance criteria

Stage 2 is complete only when all of the following are true:

- Every and only manifest-included route is statically generated or explicitly listed as an approved external destination; all approved redirects resolve to their declared canonical target; excluded paths are not generated or rendered as links.
- `/` is the canonical homepage; `/homepage`, applicable `/impact-in-action` and `/archive` aliases, and all 31 monthly archive paths follow the approved redirect records.
- Included Impact, News, event/programme, annual-report, institutional, contact/media/donation presentation, legal, and 404 page families match their approved source contract and have an assigned template family.
- Repeatable content is typed, ordering and pagination are deterministic, and a catch-all route cannot expose undeclared content.
- Every local asset required by an included page is manifest-backed and matches its expected SHA-256 hash; actual external services remain external destinations.
- Newsletter, contact, and media forms are clearly display-only without an approved endpoint; donation is visibly external; no payment, authentication, analytics, CMS, or form backend exists.
- Generated HTML, CSS, JavaScript, fonts, images, icons, and local documents do not depend on Squarespace at runtime. No included route has a missing asset, broken approved internal link, unexpected console error, or failed response.
- Navigation, dropdowns, mobile menu, pagination, and captured controls work with keyboard and pointer input; semantic landmarks, focus visibility, reduced motion, alternative text, and accessibility checks meet the project quality bar.
- Source and implementation comparisons at matching desktop/mobile viewports and required states have no unresolved P0, P1, or P2 defects. Any approved P3 finding is recorded in the final visual handoff.
- The final manifests, route classifications, visual report, and handoff documentation accurately describe the shipped Stage 2 branch state.

## Explicit non-goals

This design itself does not begin Stage 2 implementation or authorize any application, configuration, package, evidence, source-capture, asset-download, test, deployment, push, merge, or pull-request change. It does not reopen Stage 1, change its remote branch or PR, alter a Vercel domain, claim free hosting, or claim a provider charge is zero.

Stage 2 does not include Fellow Directory or alumni functionality; fellows, directory data, searches, detail pages, or iframes; Hillary Institute content; malformed or stale paths; `/watch` hash variants; stale templates; Squarespace administration; CMS authoring; authentication; commerce; payments; analytics; production form handling; an invented redesign; or content and assets outside manifest-included inputs.

## Self-review record

Reviewed before commit for placeholders, contradictions, ambiguity, scope creep, accidental implementation authorization, unsupported billing claims, and consistency with `AGENTS.md`, `PLAN.md`, and the stakeholder-readiness design.

- **Placeholders and decisions:** none. Canonical homepage, legacy aliases, monthly-archive treatment, included and excluded families, form behavior, manifest-defined local assets and external destinations, staffing, concurrency, billing cap, usage reader, stop conditions, and release policy are explicit.
- **Consistency:** the design retains Astro, typed collections, local assets, distinct templates, the Stage 1 four routes, source capture before implementation, and the project quality bar. It preserves the directory and Hillary Institute exclusions and strengthens the existing manifest requirement rather than creating a competing architecture.
- **Scope:** it defines a future Stage 2 only. Written-spec review permits detailed planning; Stage 1 merge and owner approval of the detailed plan are required before any implementation action.
- **Billing:** the $0 limit is limited to incremental provider spend and existing approved capacity. It does not convert credits to dollars, promise free provider or hosting use, or permit a paid fallback.
- **Release safety:** it preserves the open Stage 1 PR and remote head, uses a separate post-merge Stage 2 branch and PR, permits only a future branch preview under separate readiness gates, and forbids a domain change.
- **Visual-review efficiency:** VisualDesigner is reviewer-only; BuildLead/ContentAssets own compact mechanical evidence bundles. The protocol has one correction/recheck, fresh context, batched tools, warnings at 6/10, caps at 8/12, raw-event inspection before retry, immediate first-429 stop, structured cap blocker, complete ledger fields, and no quality concession for a call/cost target.
