# EHF Static Site — Stage 1 Spike

This repository contains only the approved four-route Astro spike:

- `/`
- `/read`
- `/read/how-chemergy-is-changing-the-game-in-waste-to-energy`
- `/23-annual-report`

Source-relative navigation to other EHF pages is intentionally retained for comparison, but those pages are not part of this spike.

## Setup

```bash
npm install
npx playwright install chromium
```

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run assets:verify
npm run test:unit
npm run test:e2e
```

`npm run build` runs Astro checks and creates static output in `dist/`. `npm run assets:verify` rejects prohibited runtime Squarespace asset references. The E2E suite uses the development server and includes the fixed four-route, navigation, visual-evidence, and accessibility contracts.

## Content and local assets

The selected article is authored in `src/content/impact/`. Archive card data lives in `src/data/impactArchive.ts`. Images, fonts, and report downloads used by the spike are local files under `public/assets/`, with provenance and approval recorded in `source-evidence/asset-manifest.json`. Do not add runtime hotlinks.

## Mandatory Stage 1 gate

Before any owner gate decision, run:

```bash
npm run build
npm run assets:verify
npm run test:unit
npm run test:e2e -- tests/e2e/spike.spec.ts tests/e2e/navigation.spec.ts tests/e2e/spike-visual.spec.ts tests/e2e/accessibility.spec.ts
```

Review `SPIKE-RESULTS.md` after those commands complete. Its recommendation is evidence only; it does not authorize work beyond the four-route spike.
