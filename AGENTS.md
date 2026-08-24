# EHF Static Site Project

## Purpose

This repository will contain a faithful, frontend-only static recreation of the public Edmund Hillary Fellowship website at <https://www.ehf.org/>.

The goal is to preserve the current site's visual identity, public content, responsive behavior, navigation, and meaningful interactions without depending on Squarespace at runtime. The finished site should be statically buildable, easy to maintain, and deployable to an ordinary static host.

## Current Scope

- Recreate the EHF homepage at desktop and mobile sizes.
- Recreate pages reachable from EHF's current primary navigation.
- Migrate genuine public editorial content, including the Impact in Action archive and its static article pages.
- Recreate shared navigation, dropdowns, mobile menu, footer, newsletter presentation, responsive layouts, and page-level interactions.
- Store permitted images, logos, fonts, icons, and documents locally. Do not hotlink production assets in the finished build.
- Preserve meaningful source URLs when practical and define redirects for intentionally renamed routes.
- Recreate the current public Fellow Directory only after its public-data contract, upstream-service dependency, licensing terms, and implementation plan have written approval.

## Explicitly Out of Scope

- The [Hillary Institute website](https://www.hillaryinstitute.com/). This project does not clone any Hillary Institute page; it may become a separate project later.
- The private NAC-only Fellow Directory, its authentication, internal records, administration, and editor workflows.
- Squarespace administration, CMS authoring, authentication, payments, or other backend behavior.
- Stale templates, malformed paths, duplicate routes, test pages, and obsolete pages that happen to appear in the Squarespace sitemap but are not part of the current public experience.
- Inventing a redesign. This is a source-faithful recreation.

## Source of Truth

The live EHF site is the visual and content source of truth. Before implementing a page or state, capture its desktop and mobile appearance, content, assets, links, and interactions. If live behavior conflicts with assumptions in `PLAN.md`, record the evidence and update the plan before building from a guess.

Only copy content and assets that the project owner has permission to reproduce. Preserve source attribution and document licensing constraints when they apply.

## Technical Direction

- Use Astro and TypeScript to generate static HTML.
- Use content collections for repeatable editorial content such as Impact in Action and news posts.
- Use local CSS and small, focused components. Avoid recreating Squarespace's generated DOM or importing its runtime.
- Use client-side JavaScript only where an interaction requires it, such as menus, carousels, lightboxes, or form feedback.
- Use Playwright for route, interaction, responsive, accessibility, and screenshot checks.
- Keep the EHF implementation independent so another site can be added later without coupling the two brands.

## Delivery Strategy

The public-site restoration is complete. The next scoped work is the current public Fellow Directory.

Do not begin Directory implementation, modify upstream data, copy licensed code, change public data exposure, or deploy a Directory surface until EHF has approved the public-data contract, dependency, licensing terms, test environment, and implementation plan in writing.

## Quality Bar

- Match the source at agreed desktop and mobile viewports, including typography, spacing, colors, image crops, gradients, and responsive order.
- Navigation, dropdowns, mobile menu, links, pagination, and visible controls must work.
- Pages must not depend on Squarespace JavaScript, CSS, or hotlinked media at runtime.
- The production build must complete without broken internal links, missing local assets, or browser console errors.
- Respect semantic HTML, keyboard access, focus visibility, reduced-motion preferences, useful alternative text, and reasonable performance budgets.

## Working Rules

- Read `PLAN.md` before implementation and track progress in its checkboxes.
- Respect the spike gate. Completing the four spike pages does not authorize full-site migration.
- Preserve captured source evidence and asset manifests; they are inputs to the build and visual QA.
- Prefer reusable page templates over page-specific duplication.
- Keep the private NAC-only Directory and its data-management surfaces out of scope. Treat all approval gates for the public Directory as blocking before implementation.
- Do not claim visual fidelity from build success alone. Compare source and local screenshots at the same viewport and state.
