# EHF Stakeholder Readiness Design

**Status:** owner-approved pre-Stage-2 design; no Stage 2 work is authorized by this document.
**Date:** 2026-08-08
**Authoring runtime:** `openai-codex/gpt-5.6-terra`
**Decision owner:** EHF Archive owner
**Implementation gate:** an explicit, subsequent owner `GO` naming the approved scope and budget guardrails.

**Accountability rule:** Until the EHF Archive owner names a written delegate in the PR, that owner is the publication operator, deployment operator, and billing owner in every gate below. A delegate must be named before acting and must attach the stated evidence; delegating an action does not delegate the owner's approval authority.

## Purpose and non-goal

This design makes the completed Astro spike ready for public GitHub review and a zero-dollar Vercel Hobby deployment, while putting clear limits around a possible Stage 2. It records the approved public repository, deployment, cost, staffing, and schedule decisions so that the owner can make a later informed `GO`, `ADJUST`, or `STOP` decision.

It does **not** create a GitHub repository, push a branch, open a pull request, change Vercel, install packages, deploy, change the custom domain, or start any Stage 2 task. A recommendation or estimate in this document is planning input, not authorization.

## Approved decisions

| Area | Approved decision | Required evidence before acting |
| --- | --- | --- |
| Public repository | Create public GitHub repository `ehfarchive/ehf.org`. | GitHub repository visibility is **Public** and the reviewed files pass the pre-publication gate below. |
| Branch preservation | Keep the existing `master` commit as the default branch; do not advance it as part of publication. | GitHub shows `master` as default and its commit equals the recorded original baseline. |
| Review branch | Push completed `feature/ehf-astro-spike`, then open a PR from it to `master`. | Remote branch SHA equals the reviewed local branch SHA; PR base is `master`; PR head is `feature/ehf-astro-spike`. |
| Deployment | Use Vercel's Git integration for automatic deployments. | Vercel project is linked to `ehfarchive/ehf.org`; a branch push creates its expected deployment. |
| Access | The preview deployment is public and has no authentication gate. | An unauthenticated browser session loads the deployment. |
| Existing endpoint | Retain the current Vercel URL: <https://ehf-rlgywatsn-ehf-archive.vercel.app/>. | The endpoint serves the selected Vercel deployment. |
| Hosting cost | Move the current EHF Archive Vercel team from its Pro trial, ending **2026-08-22**, to a confirmed Hobby plan before continued use. The target hosting charge is $0 only while Hobby eligibility and limits hold. | Vercel billing/dashboard shows Hobby, no paid seats or pending Pro renewal, and the public repository integration is connected. |
| Vercel project contract | Build with `npm run build`; publish `dist`; use project-local `vercel@58.8.0`. | A Vercel deployment log uses that command and output directory; the locked local dependency resolves to 58.8.0. |
| Domain | Do not make a custom-domain switch in this work. | Vercel domain settings remain unchanged. |

## Repository publication workflow

### Preconditions and boundary

The publication operator first records the local branch, commit, and user-owned working-tree changes. For this design's baseline, the intended branch is `feature/ehf-astro-spike` at `33d1462b1de5af269b2342f76e96478f362b0ef8`; the only expected local user modifications are unstaged `.gitignore`, `package.json`, and `package-lock.json`. Those files are outside this document's commit and must remain byte-for-byte unchanged.

Before any public push, perform all of the following against the exact commit selected for review:

1. Inspect the complete commit range that will become public, including files, Git history, tracked configuration, source evidence, generated evidence, asset manifests, and documentation. Confirm that no credential, token, private contact data, internal URL, private source capture, or unapproved personal data is present. Scan both the working tree and reachable history; public Git history cannot be made private again by deleting a later file.
2. Review every localized asset and document for provenance, permission status, attribution, and license compatibility with public redistribution. Resolve or remove each missing or incompatible record before publication. Do not infer permission from an asset being publicly reachable on the source site.
3. Confirm `.vercel` is ignored and untracked. It can contain local project/link metadata and must not enter Git history. Also confirm no deployment token or `.env*` secret is tracked.
4. Review the final diff for only intentional files. Enable GitHub secret scanning and push protection where they are available for the public repository; those are a second control, not a replacement for the review above.
5. Record the reviewer, date, commit SHA, scan tooling/version and results, asset/license decision, and any removals in the PR. A clean result must say what was scanned; “no issues found” without scope is insufficient.

### Publication sequence

1. Create `ehfarchive/ehf.org` as a **public** GitHub repository. Set `master` as its default branch and initialize it with the original `master` commit only. Do not add a generated README, license, `.gitignore`, or other initialization commit that would change that baseline.
2. Push the completed `feature/ehf-astro-spike` branch. Verify the remote SHA, commit range, and default-branch SHA before opening review.
3. Open a PR from `feature/ehf-astro-spike` to `master`. The PR description must state that this is the completed Stage 1 spike, link its evidence, identify intentionally unavailable destinations, and repeat that Stage 2 remains blocked pending a separate owner decision.
4. Turn on the Git integration only after the public-repository and secret/license gates pass. Git pushes then create the configured preview deployments automatically. Do not merge or advance `master` merely to make a deployment happen.
5. Preserve the local user changes throughout. If any action would stage, rewrite, regenerate, or alter `.gitignore`, `package.json`, or `package-lock.json`, stop and restore the publication plan rather than silently including the change.

The GitHub default-branch and repository-creation procedures are documented by GitHub at [creating a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository) and [changing the default branch](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/changing-the-default-branch).

## Vercel transition and public-access state

### Required account transition

The EHF Archive Vercel team is currently on a Pro trial that ends 2026-08-22. Before the trial renews or the project receives continued traffic, the billing owner must cancel/downgrade the trial and then independently confirm the team is on **Hobby**. This confirmation is a dashboard state, not an assumption based on a cancellation request.

A public GitHub organization repository is deliberately part of the plan: Vercel permits Hobby deployment from a public organization repository, while a private organization repository requires Pro. Hobby is for personal, non-commercial use; if EHF's intended use does not meet that condition, the owner must not claim a zero-cost Hobby deployment and must decide whether to fund Pro or stop deployment. The published repository's visibility does not settle that usage-policy question.

### Deployment configuration

Configure the Vercel project only after the account transition is confirmed:

| Setting | Required value | Verification |
| --- | --- | --- |
| Git repository | `ehfarchive/ehf.org` | Vercel integration view shows the exact repository and branch mapping. |
| Framework/build command | `npm run build` | Deployment log shows the command succeeded. The current project script runs `astro check && astro build`. |
| Output directory | `dist` | Vercel serves the generated static output from `dist`. |
| CLI dependency | project-local `vercel@58.8.0` | Lockfile/dependency resolution and deployment record identify 58.8.0; no global CLI is required. |
| Production/default branch | `master` | `master` remains the original baseline until an owner-approved merge. |
| Preview branch | `feature/ehf-astro-spike` | A push produces its preview deployment. |
| Preview protection | disabled for the selected public preview | A logged-out/private browser reaches the deployed route without Vercel Authentication, password, or share-link gate. |
| URL | `https://ehf-rlgywatsn-ehf-archive.vercel.app/` | The deployment detail identifies this URL or the owner explicitly records a Vercel-assigned replacement before proceeding. |
| Custom domains | no change | Domain configuration is unchanged. |

Astro's Vercel guidance is at [Deploy your Astro site to Vercel](https://docs.astro.build/en/guides/deploy/vercel/). Vercel's Git behavior and plan limitations are documented at [Git integrations](https://vercel.com/docs/git), [Hobby](https://vercel.com/docs/plans/hobby), and [Pro](https://vercel.com/docs/plans/pro-plan).

### Zero-cost guard

“Zero-cost” here means no planned Vercel platform charge while all of the following remain true; it is not a promise of unlimited free service:

- the team is actually on Hobby, has no paid seat or retained Pro subscription, and its actual use is allowed by Hobby's personal/non-commercial terms;
- the public repository remains public and the integration does not become a private organization-repository deployment;
- traffic, edge requests, deployment frequency, build use, and all other current Hobby limits remain within the plan; and
- no paid Vercel add-on, custom domain service, paid third-party service, or paid model usage is added without a separate owner approval.

For a static Astro deployment with no Functions, fast data transfer, edge requests, and deployment/build limits are the practical items to watch; a Functions budget is not the expected constraint. The operator must establish a monthly dashboard check for plan, data transfer, edge requests, deployments, and any billing notification. On the first warning of a limit, plan mismatch, or charge, stop nonessential deployments and report the actual dashboard reading to the owner before further use. Do not permit overage on the assumption it will still be free.

## Model and agent economics

### What Stage 1 measured—and did not measure

Stage 1 dispatched 48 directly routed agents: 30 `openai-codex/gpt-5.6-terra` agents, 9 `anthropic/claude-opus-5` agents, and 9 `openrouter/deepseek/deepseek-v4-flash-0731` agents. The route identities were checked by the three model-check agents and the runtime configuration. Stage 1 has **no token, credit, or dollar telemetry**. It recorded wall-clock evidence rather than model usage, so an exact Stage 1 dollar total cannot be reconstructed and must not be invented.

Published prices are useful for rate comparison but cannot substitute for workspace billing telemetry:

| Model/billing surface | Published rate distinction | Source and use in this plan |
| --- | --- | --- |
| `gpt-5.6-terra`, OpenAI API | $2 / million input tokens, $0.20 cached input, and $12 output; long-context and cache-write rules also apply. | [OpenAI model page](https://developers.openai.com/api/docs/models/gpt-5.6-terra). This is an API rate, not the Codex-agent bill. |
| `openai-codex/gpt-5.6-terra`, Codex | 50 input, 5 cached-input, and 300 output credits / million tokens; public material does not publish a universal credit-to-USD conversion. | [OpenAI Codex rate card](https://help.openai.com/en/articles/20001106-codex-rate-card). The workspace Usage panel is authoritative. |
| `openai/gpt-5.6-terra`, OpenRouter | $1 / million input, $0.10 cached read, $1.25 cache write, and $6 output under OpenRouter's listed model route. | [OpenRouter Terra page](https://openrouter.ai/openai/gpt-5.6-terra). This is a different billing surface from OpenAI API and Codex. |
| `anthropic/claude-opus-5` | $5 / million input, $25 output, $0.50 cache hit; cache-write, batch, and fast-mode prices differ. | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing). Use only if this route is actually enabled. |
| `openrouter/deepseek/deepseek-v4-flash-0731` | $0.09 / million input, $0.018 cached input, and $0.18 output. | [OpenRouter DeepSeek page](https://openrouter.ai/deepseek/deepseek-v4-flash-0731). Use only if this route is actually enabled. |

The apparent rate differences are not interchangeable: raw OpenAI API dollars, Codex credits, and OpenRouter dollars have separate billing systems. Therefore no forecast in this document converts agent count to a dollar total. Before any Stage 2, the owner must select the permitted billing surface, set its spend/credit cap in the authoritative account, and name the person who reads that account's usage panel.

### Lean Stage 2 operating contract

If and only if the owner later authorizes Stage 2, use a smaller, outcome-based team:

| Role | Default model | Owns | Must not do |
| --- | --- | --- | --- |
| Build/integration lead | `openai-codex/gpt-5.6-terra` | route architecture, acceptance tests, integration, deployment handoff, one accepted commit per completed boundary | delegate its final integration/commit responsibility to a commit-only agent |
| Visual reviewer | `anthropic/claude-opus-5` | source visual measurement, visual acceptance review, a narrowly leased presentation refinement when needed | edit data, route, test, or deployment contracts outside an explicit lease |
| Content/research worker | `openrouter/deepseek/deepseek-v4-flash-0731` | bounded sitemap classification, asset/copy/provenance preparation, link and metadata checks | make scope, licensing, or publication decisions |

Plan **10–14 outcome tickets**, not an agent-per-substep plan. Permit at most **three concurrent agents**. Give each ticket one clear owner, input evidence, changed-file or read-only boundary, expected acceptance evidence, and a stop condition. The integration lead may commit an accepted outcome; there are no commit-only tickets. Do not dispatch duplicate full-suite testing: each milestone has one test owner and one batched review containing the changed tickets. A ticket that discovers a cross-cutting defect returns it to the responsible owner with the exact evidence rather than creating parallel speculative fixes.

Maintain a cost ledger from the first authorized task with: date, ticket, role/model route, account/billing surface, request or session identifier when available, input/output/cache units or credits from the provider, observed charge, cumulative charge, cap remaining, and 429/rate-limit events. The operator stops all new model dispatches on the **first 429** or any cap/billing anomaly, records the provider response and ledger state, and asks the owner whether to wait, reduce concurrency, switch only an explicitly approved route, or stop. No automatic retry storm is permitted.

This contract corrects Stage 1's avoidable process cost: dedicated commit-only work, duplicate planning, repeated full-suite runs, and separate review agents that caused multiple fix/re-review loops. It retains the useful separation between technical integration, visual judgment, and bounded content preparation.

## Scope sizing and completion schedule

### Observed sitemap sizing

The source sitemap observed on 2026-08-08 has 274 unique URLs. The planning classification excludes 104 obvious routes, leaves 39 routes ambiguous for owner decision, and gives a likely content pool of approximately 155 routes. The main drivers are 84 usable Impact articles and 27 News articles; `/watch` contains 88 URL variants of only three mangled posts and is excluded rather than treated as content volume. The ambiguous set is mainly 31 monthly archive pages and six events/programme pages.

The likely route-template count is **9–11**: homepage; Impact listing/pagination and article; News listing and article; event/roundup; institutional; annual report/PDF; contact/media/donation forms; legal; and 404. These are estimates, not a content authorization. They build on Stage 1 primitives but do not assume linear effort per URL.

Before a Stage 2 `GO`, the owner must decide: canonical homepage identity among `/homepage`, `/impact-in-action`, and `/archive`; whether the fellow-heavy archive is included; whether the 31 monthly pages are included; whether display-only forms are acceptable; and which assets/PDFs may be downloaded and published. A route remains out of scope until its classification, content rights, and acceptance rule are explicit.

### Planning range

Stage 1 took 6 h 44 m 56 s for four routes, including a new scaffold, shared shell, content pipeline, assets, tests, visual work, and review. That result is a calibration point only, not a per-route multiplier.

For the possible 155-route, 9–11-template scope, estimate **45–90 aggregate agent-hours** (base case approximately 65) and **4–10 calendar days** after an explicit `GO` (base case approximately 6). The calendar range assumes three agents maximum, bounded content decisions, existing Stage 1 primitives, and one final visual/link/accessibility gate. It excludes time waiting for owner content, permission, billing, account, or source-site decisions. New template families, forms with submissions, source-rights gaps, rate limits, or an expanded archive move the work outside this estimate and require an owner re-plan.

## Gates, verification, and rollback

### Readiness gates

| Gate | Owner | Pass condition | Failure action |
| --- | --- | --- | --- |
| Public-data and rights review | Publication operator, with owner decision on ambiguity | Secrets/private-data scan, asset provenance/license review, `.vercel` ignored, and PR evidence are complete for the selected commit. | Do not push; remove or replace the affected material and repeat the review. |
| GitHub publication | Publication operator | Public `ehfarchive/ehf.org`, unchanged default `master` baseline, correct feature-branch SHA, and opened PR. | Stop before Vercel connection; correct repository/branch state. |
| Hobby eligibility and billing | Vercel billing owner | Pro trial is cancelled/downgraded and Hobby is visibly confirmed; public-repo integration and usage policy are eligible. | Disconnect/withhold deployment; do not claim zero cost. Escalate funding or stop. |
| Public deployment | Deployment operator | `npm run build` succeeds, `dist` is served, deployed preview is public without authentication, designated URL is reachable, and no domain switch occurred. | Disable or unlink the deployment; fix configuration through review and redeploy only after the gate passes. |
| Ongoing free operation | Billing owner | Monthly dashboard check confirms Hobby, no billing anomaly, and use within applicable limits. | Stop nonessential deployments at the first warning; report and obtain owner decision. |
| Stage 2 authorization | EHF Archive owner | Written `GO` names final sitemap choices, rights decisions, model billing cap, spending owner, and success criteria. | Do not create tickets, obtain assets, change routes, or begin migration. |

### Rollback paths

- **Before any public push:** retain the branch locally and fix the review finding. No public remediation is needed.
- **Wrong repository visibility or accidental sensitive publication:** immediately stop deployments and revoke/rotate the affected credential. Remove access from Vercel/GitHub, notify the owner, and use GitHub's documented sensitive-data-removal process if appropriate. A rewritten commit does not erase a public clone, cache, or exposed secret, so rotation is mandatory.
- **Incorrect Vercel plan, limit warning, or paid charge:** stop deploys, unlink the Git integration or disable the project as needed, cancel/downgrade back to confirmed Hobby where eligible, and provide the dashboard evidence before resuming. Do not “test” a paid fallback without approval.
- **Bad deployment:** leave `master` at its original baseline; revert or correct only through the feature-branch PR and redeploy the reviewed commit. No custom-domain cutover is available or required.
- **Model rate limit or spend anomaly:** halt after the first 429 or cap signal, preserve the ledger, and wait for the owner's explicit decision. Do not retry through unapproved providers.
- **Stage 2 uncertainty:** remain at the Stage 1 stop point. The absence of a decision is a `STOP`, not implied consent to proceed.

For public-repository secret controls, see [GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning). For handling an exposed credential, use GitHub's [removing sensitive data](https://docs.github.com/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) guidance in addition to credential rotation.

## Acceptance record for this design

This design is ready for owner use only when all statements below are true:

- [x] It names the public repository, preserves the original `master` default branch, and requires a PR from the completed feature branch.
- [x] It requires automatic Git deployments, public unauthenticated preview access, `npm run build`, `dist`, project-local `vercel@58.8.0`, the current Vercel URL, and no custom-domain change.
- [x] It makes the Pro-trial end date, Hobby confirmation, public-organization-repository condition, and ongoing no-charge guard explicit without claiming unlimited free service.
- [x] It records Stage 1's 48-agent model split and the absence of token/cost telemetry; it distinguishes published model billing surfaces instead of inventing a total.
- [x] It limits a possible Stage 2 to balanced roles, 10–14 outcome tickets, maximum three-way concurrency, one batched milestone review, no commit-only work, no duplicate full-suite runs, first-429 stop, and a cost ledger.
- [x] It states the 274/104/39/approximately-155 sizing, 9–11-template estimate, 45–90-agent-hour range, 4–10-day range, and approximately-six-day base case with their assumptions and unresolved owner decisions.
- [x] It includes pre-publication review, deployment verification, rollback paths, and source links.
- [x] It does not authorize Stage 2, a public push, a Vercel change, or any other execution action.

## Evidence sources

| Evidence | Source | How it was used |
| --- | --- | --- |
| Stage 1 completion, route/evidence/test boundary, no Stage 2 authorization | `SPIKE-RESULTS.md` and the Stage 1 handoff recorded in project state, both at the reviewed feature-branch baseline | Establishes the completed-spike stop point and non-linear calibration. |
| Stage 1 model routing/counts and no telemetry | Stage 1 agent history/model checks and project-state handoff at the reviewed feature-branch baseline | Establishes 30 Terra, 9 Opus, 9 DeepSeek agents and the no-dollar-total limitation. |
| Existing Astro build command and dependency record | `package.json` at the reviewed feature-branch baseline | Establishes `npm run build` and current project-local Vercel dependency record. |
| Sitemap route classification | <https://www.ehf.org/sitemap.xml>, observed 2026-08-08 | Establishes 274 unique URLs and the stated inclusion/exclusion/ambiguity planning counts. |
| GitHub repository/branch/secret procedures | [Create repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository), [default branch](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/changing-the-default-branch), [secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning) | Defines the publication and prevention controls. |
| Vercel deployment, eligibility, and plan conditions | [Git](https://vercel.com/docs/git), [Hobby](https://vercel.com/docs/plans/hobby), [Pro](https://vercel.com/docs/plans/pro-plan), [Astro on Vercel](https://docs.astro.build/en/guides/deploy/vercel/) | Defines automatic Git deployment, public/private organization-repository distinction, plan confirmation, and build settings. |
| Terra pricing by billing surface | [OpenAI API model](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [Codex rate card](https://help.openai.com/en/articles/20001106-codex-rate-card), [OpenRouter Terra](https://openrouter.ai/openai/gpt-5.6-terra) | Prevents an invalid single Terra dollar rate. |
| Opus and DeepSeek published rates | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), [OpenRouter DeepSeek](https://openrouter.ai/deepseek/deepseek-v4-flash-0731) | Supplies comparison rates only, not a reconstructed Stage 1 cost. |

## Self-review record

Reviewed before commit for: unresolved placeholders, contradictions, ambiguous ownership, accidental Stage 2 authorization, unsupported dollar claims, and dead or unlabelled links.

- **Placeholders:** none. Dates, repository, branch, URL, plan, routes, owners, limits, and evidence are named.
- **Consistency:** the document keeps `master` unchanged as default, places work on `feature/ehf-astro-spike`, and treats Vercel deployment as a later controlled action.
- **Ownership:** the decision owner, publication operator, deployment operator, billing owner, integration lead, visual reviewer, and content/research worker are distinguished. Any unnamed role assignment blocks the relevant gate.
- **Scope:** all public-push, Vercel, and Stage 2 actions are future-gated. This document itself grants none of them.
- **Cost claims:** only published source rates and a conditional $0 Hobby target are stated. There is no fabricated Stage 1 or Stage 2 dollar total, and Codex credits are not converted to dollars.
- **Links:** primary provider and GitHub documentation URLs are included beside the decisions they support; operational claims tied to the existing project identify their repository/state evidence.
