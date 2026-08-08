# EHF Stakeholder Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the completed four-route EHF Astro spike ready for public GitHub review and a verified public, zero-dollar-guarded Vercel Hobby preview without advancing `master`, changing a custom domain, or beginning Stage 2.

**Architecture:** This is an operations plan, not an application change. BuildLead validates and commits the owner-approved project-local Vercel dependency, then conducts a manual public-data and rights gate against one recorded feature commit. The publication operator creates and verifies the public repository and PR; the billing owner confirms Hobby interactively before the deployment operator connects the existing Vercel project to Git and verifies the feature preview.

**Tech Stack:** Git and GitHub CLI or GitHub web UI, existing GitHub/Vercel accounts, Astro 7 static build, npm lockfile v3, project-local `vercel@58.8.0`, Vercel Git integration, private/incognito browser verification.

---

## Authority, scope, and non-negotiable stop conditions

This plan implements only the owner-approved design at `docs/superpowers/specs/2026-08-08-ehf-stakeholder-readiness-design.md`. It is executable only after the EHF Archive owner gives a written publication/deployment authorization and, when applicable, names a written delegate in the PR. The owner remains the approval authority even when an operator performs a step.

The selected implementation branch is `feature/ehf-astro-spike`. Its plan-writing baseline is `2e3ed8f758e66c5924f95073758c36111b77f819`; its original `master` baseline is `2cfbde01e3967fc8f9443d6e838dcf421c276c3d`. The pre-existing owner changes are unstaged `.gitignore`, `package.json`, and `package-lock.json`; they add `.vercel` ignore rules and project-local `vercel@58.8.0`. This plan's own commit must not stage, edit, regenerate, or otherwise alter those files. In the later execution, BuildLead may make exactly one reviewed dependency commit containing those three files after Task 2 passes.

Stage 1 is complete for exactly these static routes:

1. `/`
2. `/read`
3. `/read/how-chemergy-is-changing-the-game-in-waste-to-energy`
4. `/23-annual-report`

The intentionally unavailable destinations listed in `SPIKE-RESULTS.md` remain unavailable. This plan MUST NOT create routes, acquire or localize assets, edit application/configuration files other than the approved dependency trio, modify source evidence, alter a custom domain, merge a PR, advance `master`, or start a Stage 2 ticket. A missing owner decision is `STOP`, not consent.

### Roles, handoffs, and audit rule

| Role | Required route / authority | Owns | Cannot do |
| --- | --- | --- | --- |
| EHF Archive owner | Approval authority | Written authorization, final public/private decision, unresolved rights and policy decisions, billing/deployment delegation, any Stage 2 `GO` | Treat a delegate's action as an approval or infer Hobby eligibility |
| BuildLead | `openai-codex/gpt-5.6-terra` | Dependency validation, its own scoped commits, command evidence, one batched verification run at the dependency boundary, PR evidence drafting | Delegate an accepted commit to a commit-only worker, edit `master`, or start Stage 2 |
| Publication operator | Owner unless explicitly named in the PR | GitHub repository, visibility, branch publication, secret-scanning controls, PR creation | Push before the public-data/rights gate passes |
| Billing owner | Owner unless explicitly named in the PR | Interactive Vercel trial cancellation/downgrade, Hobby confirmation, monthly billing check | Supply credentials in chat, logs, source, or PR evidence; claim Hobby eligibility without dashboard confirmation |
| Deployment operator | Owner unless explicitly named in the PR | Existing Vercel `ehf.org` project configuration and browser verification | Change custom domains, use a paid fallback, or make `master` deploy the spike |
| Read-only boundary auditor | No write, deploy, or billing access | One review of the evidence for each boundary before the next boundary starts | Commit, rerun the full suite, change a service setting, or replace the responsible operator |

There is one read-only audit at each boundary: dependency commit, public-data/rights gate, GitHub publication/PR gate, billing gate, and deployment gate. BuildLead owns any implementation commit itself. There are no commit-only tickets and no duplicate full-suite run: Task 2 has the only batched local verification; later tasks inspect the already selected commit, remote state, Vercel records, and browser behavior.

### Planned file and service-operation map

| Item | Operation | Owner |
| --- | --- | --- |
| `.gitignore` | Commit the already-reviewed `.vercel` ignore entry only after validation | BuildLead |
| `package.json` | Commit the already-reviewed `devDependencies.vercel: "^58.8.0"` only after validation | BuildLead |
| `package-lock.json` | Commit the already-reviewed lockfile resolving `node_modules/vercel` to `58.8.0` only after validation | BuildLead |
| `docs/superpowers/plans/2026-08-08-ehf-stakeholder-readiness.md` | This plan only; its standalone commit is complete before plan execution | BuildLead |
| `SPIKE-RESULTS.md`, `source-evidence/asset-manifest.json`, tracked assets, source, tests, and docs | Read-only public-data, private-data, provenance, permission, and license inspection; modify only if a finding requires removal/replacement through a new reviewed feature-branch commit | Publication operator and owner |
| `ehfarchive/ehf.org` | Create with no initialization commit, make final visibility Public, set `master` default, enable/check available public security controls, push recorded branch refs, open PR | Publication operator |
| Existing EHF Archive Vercel `ehf.org` project | Interactive billing state, Git connection, build/output/protection configuration, preview verification; no custom-domain change | Billing owner and deployment operator |
| PR description and GitHub/Vercel dashboards | Evidence record only; never record a token, password, cookie, secret value, or private account detail | Named operators |

## Evidence variables and safe command conventions

Run all repository commands from the repository root. These variables make the selected commit and the original `master` baseline explicit; do not paste authentication tokens into a terminal or a file.

```bash
export FEATURE_BRANCH=feature/ehf-astro-spike
export MASTER_BASELINE=2cfbde01e3967fc8f9443d6e838dcf421c276c3d
export REPOSITORY=ehfarchive/ehf.org
export PROJECT_URL=https://ehf-rlgywatsn-ehf-archive.vercel.app/
```

Every task records command output as PR evidence by URL, command name, exit status, date, reviewer/operator name, and commit SHA. Evidence may name a matched file and remediation state, but MUST NOT include a credential value, session cookie, dashboard export containing account data, or unredacted private contact data.

If `gh` is unavailable, use the corresponding GitHub web UI and record the resulting URL and visible state. If the Vercel UI requires interactive authorization or an account role, stop the automated portion and hand off only to the named owner/operator; do not work around it with a credential, global CLI installation, or copied browser data.

### Task 1: Establish the authorized starting state

**Files:**
- Read only: `.gitignore`, `package.json`, `package-lock.json`, `SPIKE-RESULTS.md`, `docs/superpowers/specs/2026-08-08-ehf-stakeholder-readiness-design.md`
- Do not modify: all repository files and service settings

**Boundary owner:** BuildLead. **Read-only auditor:** one designated auditor after Steps 1–4. **Gate:** the owner has issued written authorization and named any delegate in the eventual PR.

- [ ] **Step 1: Record branch, plan-writing baseline, and exact owner-owned dirty paths before touching anything.**

  Run:

  ```bash
  git status --short --branch
  git rev-parse HEAD
  export PLAN_WRITING_BASELINE=2e3ed8f758e66c5924f95073758c36111b77f819
  test "$(git rev-parse HEAD)" = "$(git rev-parse "$FEATURE_BRANCH")"
  git merge-base --is-ancestor "$PLAN_WRITING_BASELINE" HEAD
  test "$(git diff-tree --no-commit-id --name-only -r HEAD)" = \
    "docs/superpowers/plans/2026-08-08-ehf-stakeholder-readiness.md"
  git rev-list --reverse "$PLAN_WRITING_BASELINE..HEAD" | while read -r commit; do
    test "$(git diff-tree --no-commit-id --name-only -r "$commit")" = \
      "docs/superpowers/plans/2026-08-08-ehf-stakeholder-readiness.md"
  done
  git branch --show-current
  git diff --name-only
  git diff --cached --name-only
  git diff -- .gitignore package.json package-lock.json
  git diff --cached -- .gitignore package.json package-lock.json
  ```

  Expected: branch `feature/ehf-astro-spike`; the current execution `HEAD` equals the feature tip and is the latest readiness-plan-only commit: `2e3ed8f758e66c5924f95073758c36111b77f819` is its ancestor, and every commit in `2e3ed8f758e66c5924f95073758c36111b77f819..HEAD` modifies only this readiness plan. Exactly three unstaged paths are `.gitignore`, `package.json`, and `package-lock.json`; the staged path lists are empty. The diff adds `.vercel`, `vercel@^58.8.0`, and a lockfile entry resolving `vercel` to `58.8.0`.

  If any other tracked, staged, or untracked file appears, stop. Preserve it as user work and ask the owner to classify it; do not clean, stash, reset, or include it.

- [ ] **Step 2: Confirm that `master` is the original baseline and is an ancestor of the feature branch.**

  Run:

  ```bash
  test "$(git rev-parse master)" = "$MASTER_BASELINE"
  git merge-base --is-ancestor "$MASTER_BASELINE" "$FEATURE_BRANCH"
  git log --oneline --decorate -1 master
  git log --oneline --decorate -1 "$FEATURE_BRANCH"
  ```

  Expected: both `test` and `merge-base` exit 0; `master` resolves to `2cfbde01e3967fc8f9443d6e838dcf421c276c3d`; the feature tip is the latest readiness-plan-only commit recorded in Step 1 before Task 2 creates its dependency commit.

  If `master` differs, is not an ancestor, or the feature branch is not selected, stop. Do not force-push, rebase, reset, or change the default branch to conceal the mismatch.

- [ ] **Step 3: Establish and record the later review commit only after Task 2 succeeds.**

  Run after Task 2's commit:

  ```bash
  export REVIEW_SHA="$(git rev-parse "$FEATURE_BRANCH")"
  git show -s --format='review=%H%nparent=%P%nsubject=%s' "$REVIEW_SHA"
  git diff --name-only "$MASTER_BASELINE..$REVIEW_SHA"
  ```

  Expected: `REVIEW_SHA` is the feature tip containing the Vercel dependency commit; the file list is the completed Stage 1 range plus the approved dependency trio, with no surprise files.

  If a later commit appears before the review is complete, stop and repeat the public-data/rights review against that new exact SHA. Never review one SHA and push another.

- [ ] **Step 4: Have the single read-only auditor approve the starting-state record.**

  The auditor checks the branch name, both baseline SHAs, expected dirty-path list, and Stage 2 stop condition from the evidence above. Expected result: a dated `pass` or a specific blocking discrepancy; no code, Git, GitHub, Vercel, or billing action by the auditor.

  If the auditor identifies a discrepancy, BuildLead resolves it with the owner before Task 2. Do not continue on an assumed baseline.

### Task 2: Validate and commit the approved project-local Vercel dependency

**Files:**
- Modify and commit only: `.gitignore`, `package.json`, `package-lock.json`
- Read only: `SPIKE-RESULTS.md`
- Do not modify: application source, tests, Astro configuration, Vercel project settings, domain settings, or any Stage 2 artifact

**Boundary owner:** BuildLead, using `openai-codex/gpt-5.6-terra`. **Read-only auditor:** one designated auditor after Step 5. **Commit:** BuildLead only; no commit-only worker.

- [ ] **Step 1: Validate the exact requested changes without installing or updating packages.**

  Run:

  ```bash
  git diff --check -- .gitignore package.json package-lock.json
  node -e 'const p=require("./package.json"); if (p.devDependencies.vercel !== "^58.8.0") process.exit(1); console.log(p.devDependencies.vercel)'
  node -e 'const p=require("./package-lock.json"); const v=p.packages["node_modules/vercel"]; if (!v || v.version !== "58.8.0") process.exit(1); console.log(v.version)'
  git check-ignore -v .vercel
  git ls-files --error-unmatch .vercel; test "$?" -ne 0
  git ls-files -- .env '.env.*' ':(glob)**/.env' ':(glob)**/.env.*'
  ```

  Expected: whitespace check passes; the first Node command prints `^58.8.0`; the second prints `58.8.0`; `.vercel` is ignored by `.gitignore`; `.vercel` is not tracked; and the final command prints no tracked dotenv path. Do not run `npm install`, `npm update`, a global Vercel command, or any command that changes the lockfile.

  If the lock resolution is not exactly `58.8.0`, `.vercel` is tracked, a dotenv file is tracked, or the diff contains another change, stop before staging. Fix only through an owner-reviewed feature-branch change, then repeat this step.

- [ ] **Step 2: Run the one batched local verification for the changed project boundary.**

  Run once:

  ```bash
  npm run build && npm run assets:verify && npm run test
  ```

  Expected: `astro check && astro build` succeeds; asset verification reports 40 manifest records; unit and E2E suites complete with 103 passes (12 unit and 91 E2E), 19 expected project-scoped E2E skips, and 0 failures. This current boundary result includes the one `routes.spec.ts` test in both desktop and mobile; `SPIKE-RESULTS.md` retains the historical Stage 1 total of 101 passes (12 unit and 89 E2E). A current tool-version message may be recorded only if it does not make a command fail.

  If any command fails, do not stage or commit. Preserve its exact non-secret error output, return the defect to BuildLead, and repeat this single batched command only after the responsible change is accepted. No other agent reruns the full suite for this boundary.
- [ ] **Step 3: Confirm the local executable resolves the locked CLI without global installation or authentication.**

  Run:

  ```bash
  npx --no-install vercel --version
  npm ls --depth=0 vercel
  ```

  Expected: the version output is `58.8.0` and `npm ls` reports `vercel@58.8.0` at the project root. Do not run `vercel login`, `vercel link`, `vercel deploy`, or pass a token; Git integration will deploy later.

  If `npx --no-install` cannot resolve the installed dependency, stop rather than downloading it. Restore the known project dependency state through a reviewed feature-branch fix and repeat Steps 1–3.

- [ ] **Step 4: Stage exactly the approved dependency trio and have BuildLead create its own scoped commit.**
  Run:

  ```bash
  git status --short
  git add .gitignore package.json package-lock.json
  git diff --cached --check
  git diff --cached --name-only
  git commit -m "chore: add local Vercel CLI"
  git show --stat --oneline HEAD
  ```

  Expected before committing: the staged path list contains only `.gitignore`, `package.json`, and `package-lock.json`. Expected after committing: one new feature-branch commit titled `chore: add local Vercel CLI` whose stat names only those three files.

  If any other path is staged, run `git restore --staged` with that confirmed unexpected path, recheck the index, and stop for owner review if it was previously staged user work. Never stage all files, use `git commit -a`, amend a prior commit, or commit directly to `master`.

- [ ] **Step 5: Record the selected review SHA and prove the original user changes became exactly this approved commit.**

  Run:

  ```bash
  export REVIEW_SHA="$(git rev-parse "$FEATURE_BRANCH")"
  git show --format=fuller --name-status "$REVIEW_SHA"
  git status --short
  git diff --exit-code -- .gitignore package.json package-lock.json
  git diff --cached --exit-code -- .gitignore package.json package-lock.json
  ```

  Expected: the selected SHA is the new feature tip; its named paths are only the approved trio; the working tree and index have no remaining changes to those three paths. Record `REVIEW_SHA` for every later task.

  If these files changed during validation, stop and compare their intended contents to the Step 1 evidence before any publication action. Do not regenerate, restore, or silently substitute user work.

- [ ] **Step 6: Have the single read-only auditor accept the dependency boundary.**

  The auditor reviews the exact commit, scoped file list, `58.8.0` resolution, one batched verification result, and absence of staged leftovers. Expected: a dated acceptance naming `REVIEW_SHA`, or a specific defect returned to BuildLead. The auditor does not commit or repeat the suite.

### Task 3: Pass the pre-publication public-data, history, asset, and rights gate

**Files:**
- Read only: every path in `git diff --name-only "$MASTER_BASELINE..$REVIEW_SHA"`, every commit in that range, `source-evidence/asset-manifest.json`, `SPIKE-RESULTS.md`, `.gitignore`, `package.json`, `package-lock.json`
- Modify only if a finding exists: the minimum affected feature-branch file(s), then create a new BuildLead-owned reviewed commit and restart this task
- Do not create: a custom secret scanner, a new package, a public remote, a Vercel deployment, or Stage 2 artifacts

**Boundary owner:** Publication operator, with owner decision on rights/privacy ambiguity. **Read-only auditor:** one designated auditor after Step 5. **Gate:** every finding is resolved before any public push.

- [ ] **Step 1: Freeze the exact review range and inventory every object and changed path that would become public.**

  Run:

  ```bash
  git show -s --format='review=%H%nparent=%P%nsubject=%s' "$REVIEW_SHA"
  git merge-base --is-ancestor "$MASTER_BASELINE" "$REVIEW_SHA"
  git log --reverse --format='%H %s' "$MASTER_BASELINE..$REVIEW_SHA"
  git diff --name-status "$MASTER_BASELINE..$REVIEW_SHA"
  git rev-list --objects "$MASTER_BASELINE..$REVIEW_SHA"
  ```

  Expected: the range starts after the original `master` SHA and ends at `REVIEW_SHA`; every commit, tracked path, and reachable object slated for publication is listed. Save the command output location and SHA in the PR evidence without copying sensitive content into the PR.

  If the selected SHA changes or an unexpected object/path appears, stop and return to Task 1 Step 3. A deleted later file cannot make previously public Git history private.

- [ ] **Step 2: Perform the required manual tracked-history, configuration, source-evidence, and private-data inspection.**

  Run:

  ```bash
  git log -p --find-renames "$MASTER_BASELINE..$REVIEW_SHA"
  git grep -nEI '(api[_-]?key|secret|token|password|authorization:|bearer[[:space:]]+|private[_-]?key|BEGIN[[:space:]]+(RSA|OPENSSH|EC)[[:space:]]+PRIVATE)' "$REVIEW_SHA" -- .
  git ls-tree -r --name-only "$REVIEW_SHA" -- .vercel ':(glob).vercel/**' .env '.env.*' ':(glob)**/.env' ':(glob)**/.env.*'
  git ls-tree -r --name-only "$REVIEW_SHA" -- . | sort
  ```

  Expected: the patch review and final-tree pattern review are manually dispositioned; no credential, token, private contact detail, internal URL, private source capture, or unapproved personal data is approved for publication; no `.vercel` or dotenv path is tracked. Treat the pattern command as a review aid, not a secret scanner and not proof that no secret exists.

  Manually inspect the full changed content—not only pattern matches—including `source-evidence/**`, screenshot metadata, `SPIKE-RESULTS.md`, README/PLAN/docs, source files, tests, scripts, configuration, lockfile, and every filename. For binary image/font/PDF files, inspect the manifest/provenance record and the rendered/document content enough to identify embedded private data. Do not print suspicious values; record only the affected path and a redacted finding.

  If a secret or private datum is found, do not push. Remove or replace it in a new feature-branch commit, rotate/revoke the real credential through the owner if one was exposed anywhere, set the new `REVIEW_SHA`, and repeat every Task 3 step. A history rewrite alone is not a remedy for an already public secret.

- [ ] **Step 3: Review each localized asset and document for public redistribution rights.**

  Run:

  ```bash
  node -e 'const a=require("./source-evidence/asset-manifest.json"); console.log(JSON.stringify(a, null, 2))'
  git ls-tree -r --name-only "$REVIEW_SHA" -- public/assets source-evidence
  git diff --no-ext-diff "$MASTER_BASELINE..$REVIEW_SHA" -- source-evidence/asset-manifest.json SPIKE-RESULTS.md
  ```

  Expected: each of the 40 manifest records and every localized document, font, image, screenshot, and source capture has a reviewed source/provenance, permission status, attribution requirement, and license compatibility decision for public redistribution. Public reachability on the original site is not evidence of permission.

  Record one of `approved for public redistribution`, `remove/replace before publication`, or `owner decision required` for each asset/document group. If a record is missing, incompatible, or ambiguous, do not push. The owner must decide; BuildLead removes/replaces the affected material only through a reviewed feature-branch commit and Task 3 restarts at Step 1.

- [ ] **Step 4: Confirm ignore and final-diff hygiene without adding tools or exposing values.**

  Run:

  ```bash
  git check-ignore -v .vercel
  git ls-files --error-unmatch .vercel; test "$?" -ne 0
  git diff --check "$MASTER_BASELINE..$REVIEW_SHA"
  git diff --name-only "$MASTER_BASELINE..$REVIEW_SHA"
  git status --short
  ```

  Expected: `.vercel` is ignored and untracked; diff whitespace check succeeds; all changed paths are intentional and accounted for; the working tree contains no unexplained changes. Do not install a secret scanner or create a custom scanning script for this task.

  If `.vercel` is tracked, any unexpected file is present, or a required review is incomplete, stop before repository creation. Correct the actual content or Git state on the feature branch and repeat the gate.

- [ ] **Step 5: Record a complete pre-publication gate result and receive the one read-only audit.**

  The publication operator creates PR-ready evidence containing: reviewer name, review date, `REVIEW_SHA`, command names and exit results, the exact inspected range and manual scope, pattern-review disposition, asset/license/provenance decisions, `.vercel`/dotenv state, all removals, and any owner decision. The auditor performs one read-only review of this record and the selected commit.

  Expected: one dated `pass` records what was scanned and why every public asset/document is permitted; a bare “no issues found” is insufficient. A `fail` blocks GitHub creation/push and Vercel connection until corrected and re-audited.

### Task 4: Publish the reviewed Git history to the final public GitHub repository

**Files:**
- Repository files: no modifications
- Service operations: create `ehfarchive/ehf.org`, establish remote refs, set/check default branch and public security controls
- Do not modify: `master`, custom domains, Vercel settings, or application files

**Boundary owner:** Publication operator. **Read-only auditor:** one designated auditor after Step 6. **Prerequisite:** Task 3 passed for the exact `REVIEW_SHA`.

- [ ] **Step 1: Reconfirm local refs and retain an explicit no-force/no-master-commit rule.**

  Run:

  ```bash
  test "$(git rev-parse master)" = "$MASTER_BASELINE"
  test "$(git rev-parse "$FEATURE_BRANCH")" = "$REVIEW_SHA"
  git status --short
  ```

  Expected: both SHAs match their recorded values and the working tree has no unexplained change. All subsequent pushes use explicit source and destination refs; no `--force`, `--mirror`, `git push --all`, merge, rebase, or direct `master` commit is permitted.

- [ ] **Step 2: Create the final repository without an initialization commit.**

  Preferred final-public path:

  ```bash
  gh repo create "$REPOSITORY" --public --confirm
  git remote add origin "https://github.com/$REPOSITORY.git"
  git remote -v
  ```

  Expected: GitHub shows `ehfarchive/ehf.org` with visibility **Public**, no generated README/license/`.gitignore` commit, and `origin` points only to that repository.

  A temporary private repository is allowed only when the owner explicitly requires a pre-publication security gate that cannot be performed otherwise. In that exceptional case, create it with `--private`, complete Task 3, then make the final repository Public before the first feature push and PR:

  ```bash
  gh repo edit "$REPOSITORY" --visibility public --accept-visibility-change-consequences
  gh repo view "$REPOSITORY" --json nameWithOwner,visibility,defaultBranchRef
  ```

  Expected after either path: visibility is **Public**. Do not silently leave it private: final public visibility and public PR evidence are owner decisions and required outcomes. If repository creation, namespace access, or the visibility change fails, stop before pushing and provide the owner the non-secret error/state.

- [ ] **Step 3: Push the original `master` baseline first and set it as the default branch.**

  Run:

  ```bash
  git push origin "$MASTER_BASELINE:refs/heads/master"
  gh repo edit "$REPOSITORY" --default-branch master
  git ls-remote --heads origin master
  gh repo view "$REPOSITORY" --json visibility,defaultBranchRef
  ```

  Expected: remote `refs/heads/master` equals `2cfbde01e3967fc8f9443d6e838dcf421c276c3d`; GitHub reports visibility `PUBLIC` and default branch `master`. No commit is created on local or remote `master`.

  If the remote SHA differs, default branch is not `master`, or GitHub inserted an initialization commit, stop before pushing the feature branch. Correct the remote state with the owner; never overwrite an unknown commit or force-push the baseline.

- [ ] **Step 4: Push the selected feature commit and verify the remote range.**

  Run:

  ```bash
  git push origin "$REVIEW_SHA:refs/heads/$FEATURE_BRANCH"
  git ls-remote --heads origin master "$FEATURE_BRANCH"
  git fetch origin master "$FEATURE_BRANCH"
  test "$(git rev-parse origin/master)" = "$MASTER_BASELINE"
  test "$(git rev-parse origin/$FEATURE_BRANCH)" = "$REVIEW_SHA"
  git log --oneline --left-right origin/master...origin/$FEATURE_BRANCH
  ```

  Expected: `origin/master` is the original baseline, `origin/feature/ehf-astro-spike` equals `REVIEW_SHA`, and the commit range matches the reviewed local range. The feature push does not advance `master`.

  If either ref mismatch occurs, stop before PR/deployment integration. Do not force-push; correct only a known safe remote state with the owner, then redo verification.

- [ ] **Step 5: Enable and verify GitHub's available public secret controls as a second control.**

  In the public repository UI, the publication operator opens **Settings → Code security and analysis**. Enable Secret scanning and Push protection where GitHub makes them available to this public repository, then record the visible enabled/unavailable state and the public repository URL in PR evidence. If organization policy controls these settings, record the policy state and owner/admin responsible for it.

  Expected: the controls are enabled when available or their unavailability/policy is explicitly recorded. This does not replace Task 3's manual review. Do not upload a test secret, add a secret to verify the feature, or claim a control is enabled without observing the setting.

  If required public controls cannot be enabled due to an organization policy, stop Vercel connection and ask the owner whether the recorded policy state is an acceptable publication gate. Do not bypass it by making the repository private or changing content scope silently.

- [ ] **Step 6: Receive the one read-only GitHub-publication audit.**

  The auditor reads remote ref output, GitHub public visibility/default-branch state, the security-control record, and the selected SHA. Expected: one `pass` confirms public repository, untouched `master`, matching feature SHA, and recorded security state; otherwise it blocks Task 5 and all Vercel work.

### Task 5: Open the public Stage 1 PR with complete evidence and no implied Stage 2 authorization

**Files:**
- Repository files: no modifications unless Task 3 found a real documentation defect requiring a reviewed feature-branch commit
- External artifact: PR description in GitHub

**Boundary owner:** Publication operator. **Read-only auditor:** covered by Task 4's publication boundary audit; do not create a second duplicate audit. **Prerequisite:** Task 4 passed.

- [ ] **Step 1: Prepare the PR description from observed values, never from assumptions.**

  Collect the observed values, reject empty values, and generate the non-repository temporary file:

  ```bash
  read -r -p 'Reviewer name: ' REVIEWER
  read -r -p 'Review date (YYYY-MM-DD): ' REVIEW_DATE
  read -r -p 'Pre-publication result and removals: ' PUBLICATION_RESULT
  read -r -p 'GitHub secret-scanning/push-protection state: ' SECURITY_STATE
  test -n "$REVIEWER" -a -n "$REVIEW_DATE" -a -n "$PUBLICATION_RESULT" -a -n "$SECURITY_STATE"
  cat > /tmp/ehf-stage-1-pr.md <<EOF
  Completed Stage 1 EHF Astro spike for review.

  Reviewed commit: $REVIEW_SHA
  Original master baseline: $MASTER_BASELINE
  Pre-publication review: $REVIEWER, $REVIEW_DATE; inspected commit range, tracked history/final tree, configuration, source evidence, localized assets/documents, provenance/license decisions, and .vercel/dotenv state. Result: $PUBLICATION_RESULT.
  GitHub controls: $SECURITY_STATE.
  Stage 1 evidence: SPIKE-RESULTS.md and source-evidence/implementation-screenshots/ in this branch.
  Implemented routes: /, /read, /read/how-chemergy-is-changing-the-game-in-waste-to-energy, and /23-annual-report.
  Intentionally unavailable destinations remain as listed in SPIKE-RESULTS.md.
  Stage 2 is blocked. No Stage 2 route, migration, asset acquisition, or dispatch is authorized without a separate written owner GO naming scope, rights decisions, billing cap/surface, spending owner, and success criteria.
  EOF
  ```

  Expected: all four values are observed non-empty facts; the temporary PR body contains the exact selected SHA and no literal placeholder. Link the two branch files using GitHub's PR file references or full public blob URLs. Do not include account credentials, personal contact details, billing screenshots, or internal URLs.

- [ ] **Step 2: Create and inspect the PR.**

  Run:

  ```bash
  gh pr create --repo "$REPOSITORY" --base master --head "$FEATURE_BRANCH" --title "Stage 1: EHF Astro spike" --body-file /tmp/ehf-stage-1-pr.md
  gh pr view --repo "$REPOSITORY" --json url,baseRefName,headRefName,headRefOid,state,title
  ```

  Expected: an open public PR URL; `baseRefName` is `master`; `headRefName` is `feature/ehf-astro-spike`; `headRefOid` is `REVIEW_SHA`; and the description includes every Step 1 item.

  If the PR target, head SHA, visibility, or evidence is wrong, close/correct the PR through the publication operator before proceeding. Do not merge it to produce a deployment, and do not alter `master`.

- [ ] **Step 3: Record the minimal required documentation decision.**

  Expected: no repository documentation change is necessary because `SPIKE-RESULTS.md` already names the four routes, intentionally unavailable destinations, evidence, and Stage 2 stop. The PR body is the publication evidence. Only change a repository document if Task 3 found a specific omission; that correction requires a new reviewed feature commit, repeat Tasks 3–5, and updated PR SHA evidence.

### Task 6: Safely complete the interactive Vercel billing transition

**Files:**
- Repository files: no modifications
- Service operations: current EHF Archive Vercel team billing dashboard only

**Boundary owner:** Billing owner. **Read-only auditor:** one designated auditor after Step 4. **Prerequisite:** public repository and PR evidence exist; do not connect the Git integration before this gate passes.

- [ ] **Step 1: Confirm authority and the plan deadline without transmitting credentials.**

  The billing owner signs in interactively to the existing EHF Archive Vercel team and opens its billing overview. Record the team display name, active plan, trial end date, paid seats/subscriptions/add-ons visible to the owner, and the operator/date in a redacted evidence note. Expected starting state: a Pro trial ending **2026-08-22**.

  If the operator lacks billing permission, the dashboard does not expose downgrade/cancel controls, or the account requires owner intervention, enter the safe blocked state: do not connect Git, deploy, or accept any paid fallback. Hand off the dashboard action to the named billing owner with the needed action, deadline, and redacted current state.

- [ ] **Step 2: Check Hobby eligibility before requesting a downgrade.**

  The billing owner verifies that the intended use is personal/non-commercial under the current Vercel Hobby terms, that `ehfarchive/ehf.org` is public, and that no paid add-on, paid seat, private-organization-repository deployment, or unapproved paid model/service will be retained. Record the outcome and source URL/version consulted.

  Expected: an explicit owner determination that Hobby is eligible. Repository visibility alone does not establish eligibility.

  If the use is not eligible or the owner cannot make the determination, stop deployment and zero-cost claims. The owner must choose an approved funded plan or stop; do not test a paid fallback.

- [ ] **Step 3: Cancel/downgrade the Pro trial through the Vercel UI and independently confirm Hobby.**

  In the team billing UI, select the current Pro trial's cancellation/downgrade flow, review the displayed effective date and any paid-renewal warning, and complete it only if it results in the owner-approved no-paid-plan state. Reopen the billing overview after the request.

  Expected final evidence: plan visibly says **Hobby**, no pending Pro renewal, no paid seats, no paid add-ons, and no charged or pending paid subscription. A request, email, or scheduled cancellation alone is not confirmation.

  If the UI only schedules a future change, says Pro will renew, shows a charge, or cannot confirm Hobby, remain blocked: disconnect/withhold deployment and provide the owner the redacted state before 2026-08-22. Do not enter payment details, accept a charge, or claim zero cost.

- [ ] **Step 4: Establish the monthly zero-cost guard and receive the one read-only billing audit.**

  The billing owner schedules a monthly dashboard check for plan, data transfer, edge requests, deployments, build use, paid seats/add-ons, and billing notifications. The evidence note records the check owner and first scheduled date. The auditor reviews the redacted final plan state, eligibility determination, no-paid-renewal state, and monthly check record once.

  Expected: one dated gate `pass` and a $0 target only while Hobby eligibility and current limits hold. On the first limit warning, plan mismatch, charge, or billing anomaly, stop nonessential deployments; record the actual dashboard reading; and obtain owner direction before further use. Static Astro has no expected Functions budget, but data transfer, edge requests, deployments, and build limits remain monitored.

### Task 7: Configure the existing Vercel project for Git-based Astro previews

**Files:**
- Repository files: no modifications
- Service operations: existing EHF Archive Vercel `ehf.org` project only
- Do not modify: custom domains, `master`, source/application files, or Vercel environment variables

**Boundary owner:** Deployment operator. **Read-only auditor:** one designated auditor after Step 6. **Prerequisite:** Tasks 4–6 passed and the billing dashboard visibly confirms Hobby.

- [ ] **Step 1: Identify the existing project and preserve domain state before changing build/integration settings.**

  In the Vercel dashboard, open the existing EHF Archive `ehf.org` project and record its project URL, team, current Git link state, deployment-protection state, and current custom-domain list. Expected project endpoint: `https://ehf-rlgywatsn-ehf-archive.vercel.app/`.

  If the project is not the named existing project, the endpoint belongs to a different project/team, or the operator cannot identify its current state, stop. Do not create a replacement project or alter a custom domain to compensate.

- [ ] **Step 2: Connect the final public repository and set the required Git/build contract.**

  In the existing project's Git settings, connect exactly `ehfarchive/ehf.org`. Configure/confirm:

  | Setting | Required value |
  | --- | --- |
  | Production/default branch | `master` |
  | Build command | `npm run build` |
  | Output directory | `dist` |
  | Framework | Astro, if the dashboard requires an explicit framework selection |
  | Dependency/CLI record | project lockfile resolves project-local `vercel@58.8.0`; no global CLI |
  | Preview behavior | automatic preview deployment for the pushed `feature/ehf-astro-spike` branch |
  | Vercel Authentication / SSO protection | disabled / none for the selected preview |
  | Password protection | none |
  | Custom domains | unchanged |

  Expected: the integration page visibly names the public repository and `master`; project settings preserve the named build/output values; no SSO or password gate applies to the selected preview; no domain setting changes.

  If Vercel proposes a different output directory, enables authentication, requires a private-repository/Pro path, or changes a custom domain, do not accept it. Disconnect/withhold the connection if necessary, return to the owner with the observed mismatch, and keep the PR unmerged.

- [ ] **Step 3: Trigger and identify the feature-branch automatic preview without advancing `master`.**

  If the feature push predates connection, make no content change and use the project UI's permitted redeploy action for the existing `REVIEW_SHA`, or reconnect/reselect the branch only as necessary to make Vercel process that exact Git commit. If a new Git push is required, it must be a separately reviewed feature-branch commit; never create an empty commit or touch `master` solely to trigger a deployment.

  Expected: Vercel creates a preview for `feature/ehf-astro-spike` at `REVIEW_SHA`; its deployment log shows `npm run build` succeeded and `dist` was served. Record the Vercel-assigned preview URL and deployment ID. Confirm the dependency evidence from Task 2 shows `vercel@58.8.0`; do not claim that a global CLI was used.

  If the build fails, route the exact non-secret log error to BuildLead; correct it through the feature PR, re-run the one necessary verification for that correction, repeat Task 3 for the new SHA, and let Git integration generate a new preview. If a preview is unavailable, do not merge or change `master` merely to obtain one.

- [ ] **Step 4: Verify unauthenticated public access and all four Stage 1 routes in a clean browser session.**

  In a logged-out/private browser session with no Vercel cookies, open the recorded feature preview URL and each route below:

  ```text
  /
  /read
  /read/how-chemergy-is-changing-the-game-in-waste-to-energy
  /23-annual-report
  ```

  Expected: each returns the selected deployment's rendered page without Vercel Authentication, password, SSO, share-link-only gate, redirect to login, console failure, or failed page request. Record URL, commit/deployment ID, route, HTTP/browser result, date, and observer without credentials or cookies.

  If any route is protected or fails, keep the preview blocked from stakeholder use, correct the protection/configuration or the feature branch through review, and repeat this step. Do not make it public by weakening unrelated team security or changing custom domains.

- [ ] **Step 5: Verify the retained project endpoint without silently substituting a domain or production branch.**

  In the same clean browser session, open `https://ehf-rlgywatsn-ehf-archive.vercel.app/` and use Vercel deployment details to identify which deployment it serves. Expected: it serves the selected Vercel deployment, or the owner explicitly records the Vercel-assigned replacement URL before proceeding; custom-domain settings remain unchanged.

  If the retained endpoint maps only to `master`'s original baseline and cannot serve the feature preview without merging/advancing `master`, this is a safe blocked state. Record the endpoint/deployment mapping and ask the owner to choose a compliant deployment/URL policy. Do not redirect it, promote an unreviewed deployment, change the production branch, merge the PR, or claim the endpoint verifies the feature preview.

- [ ] **Step 6: Receive the one read-only deployment audit.**

  The auditor reads the Vercel integration/build setting record, Hobby gate, feature commit/deployment association, anonymous four-route results, endpoint mapping, protections set to none for the selected preview, and unchanged-domain record. Expected: one `pass` only if every required state is observed; otherwise the exact failed condition is documented and stakeholder use is blocked.

### Task 8: Close the stakeholder-readiness gate and preserve the Stage 2 hard stop

**Files:**
- Repository files: no modifications by default
- External artifacts: PR evidence, redacted billing/deployment records, monthly check schedule

**Boundary owner:** EHF Archive owner. **Read-only auditor:** no new audit; Tasks 6 and 7 supply the final boundary audits.

- [ ] **Step 1: Produce the owner-facing readiness record from observed evidence.**

  Record: final public repository and PR URLs; `MASTER_BASELINE`; `REVIEW_SHA`; secret-scanning/push-protection state; manual history/private-data/asset/license scope and result; Vercel Hobby confirmation and date; public repository eligibility result; project build command/output directory; `58.8.0` dependency evidence; anonymous four-route preview results; retained endpoint mapping; unchanged-domain evidence; and monthly cost-check owner/schedule.

  Also record the design's model and cost conclusions exactly: Stage 1 used 48 directly routed agents (30 `openai-codex/gpt-5.6-terra`, 9 `anthropic/claude-opus-5`, 9 `openrouter/deepseek/deepseek-v4-flash-0731`) with no token, credit, or dollar telemetry, so no Stage 1 dollar total is reconstructed. API dollars, Codex credits, and OpenRouter dollars are distinct billing surfaces; any later Stage 2 must choose one authorized surface and cap from its authoritative usage panel.

  Record the future-only role and scheduling conclusions: a later Stage 2 uses 10–14 outcome tickets, at most three concurrent agents, BuildLead/Terra integration, a visual Opus reviewer, bounded DeepSeek content work, one batched milestone review, no commit-only tickets, no duplicate full-suite runs, and a first-429/cap-anomaly stop with a cost ledger. The planning estimate is 274 observed URLs, 104 excluded, 39 ambiguous, approximately 155 likely content routes, 9–11 templates, 45–90 aggregate agent-hours, and 4–10 calendar days (about 6 base case), subject to owner decisions on homepage, fellow archive, monthly pages, forms, and rights.

- [ ] **Step 2: Verify clean branch/remote state without merging.**

  Run:

  ```bash
  git status --short --branch
  git fetch origin master "$FEATURE_BRANCH"
  test "$(git rev-parse origin/master)" = "$MASTER_BASELINE"
  test "$(git rev-parse origin/$FEATURE_BRANCH)" = "$REVIEW_SHA"
  gh pr view --repo "$REPOSITORY" --json url,state,baseRefName,headRefName,headRefOid
  ```

  Expected: no unexplained local changes; remote `master` remains the original baseline; remote feature equals reviewed SHA; PR remains open from the feature branch to `master`. The plan does not merge it.

  If a remote branch changes, the PR closes/merges, or an unexpected local change appears, stop and report the exact observed state. Do not reuse a merged/deleted PR branch; any later work starts from the current target branch in a fresh branch after owner approval.

- [ ] **Step 3: Enforce the hard stop.**

  Expected end state: the Stage 1 feature PR and, if all gates passed, its public Vercel preview are ready for stakeholder review; `master` remains unchanged; no custom-domain switch has occurred; no Stage 2 work has started.

  Before any Stage 2 task, the owner must issue a separate written `GO` naming final sitemap classifications, route/content rights, homepage choice, fellow/monthly/form decisions, permitted billing surface and spend/credit cap, usage-panel reader, named roles, acceptance criteria, and deployment policy. Until then, do not create tickets, dispatch agents, download assets, change routes, modify content, or infer consent from this readiness record.

## Failure and rollback table

| Failure point | Immediate safe action | Recovery boundary |
| --- | --- | --- |
| Unclassified dirty file, wrong branch, or wrong SHA | Stop; leave user work untouched | Owner classifies state; repeat Task 1 |
| Dependency validation or batched verification failure | Do not stage/commit; return defect to BuildLead | Reviewed feature-branch fix, then Task 2 |
| Secret, private data, unapproved asset, or license ambiguity | Do not push; redact evidence; remove/replace only through review; rotate/revoke any exposed credential with owner | New `REVIEW_SHA`; repeat Task 3 completely |
| Wrong repo visibility/default branch/remote SHA | Stop before Vercel; do not force-push or overwrite unknown commits | Owner corrects GitHub state; repeat Task 4 verification |
| GitHub secret controls unavailable/policy-blocked | Record actual policy; withhold Vercel connection | Owner accepts policy or corrects it; repeat Task 4 Step 5 |
| Billing owner unavailable, Hobby ineligible, cancellation pending, paid renewal/charge, or limit warning | Withhold/disconnect deployment; stop nonessential deployments; do not accept paid fallback | Owner/billing owner confirms compliant Hobby or chooses funded/stop path; repeat Task 6 |
| Vercel build/protection/domain/endpoint mismatch | Keep PR unmerged; do not change master/domain; unlink/disable deployment if needed | Correct through reviewed feature PR or owner policy decision; repeat relevant Task 7 steps |
| Wrong deployment or public sensitive publication | Stop deployment/access; notify owner; revoke/rotate affected credential; follow GitHub sensitive-data-removal guidance | Treat rewrite as insufficient for a public secret; new review and publication decision required |
| First model 429, cap signal, or billing anomaly during a later authorized Stage 2 | Stop all new model dispatches; preserve ledger/provider response | Owner decides wait, reduce concurrency, explicitly approve route change, or stop; never retry storm |
| Stage 2 ambiguity or absent written `GO` | Remain at the Stage 1 stop point | No recovery action is authorized |

## Plan self-review record

- [x] **Spec coverage:** Tasks 1–2 validate and commit only the owner-approved local `vercel@58.8.0` change; Task 3 covers selected history, tracked files, manual private-data and asset/license review, `.vercel`, dotenvs, and no-new-tool scanning; Tasks 4–5 create final-public `ehfarchive/ehf.org`, preserve original `master`, enable/check public secret controls, push the reviewed feature branch, and open the required PR; Task 6 keeps billing interactive and confirms Hobby before 2026-08-22; Task 7 configures the existing project for Git/`npm run build`/`dist`, public automatic preview, local CLI evidence, no SSO/password gate, four-route anonymous access, retained endpoint mapping, and unchanged domains; Task 8 records cost/model/role/schedule conclusions, branch/remote checks, and the Stage 2 stop.
- [x] **Placeholders:** The plan contains no unresolved implementation placeholder or invented local scanner. The PR body is generated only from four non-empty observed variables and the recorded SHA, so no literal placeholder can reach GitHub.
- [x] **Command and branch consistency:** Every push uses `MASTER_BASELINE`, `REVIEW_SHA`, explicit destination refs, and `feature/ehf-astro-spike`; `master` is never committed, advanced, merged, rebased, or force-pushed. The public repository is `ehfarchive/ehf.org`; the retained Vercel project endpoint is `https://ehf-rlgywatsn-ehf-archive.vercel.app/`; the required build/output values are `npm run build` and `dist`.
- [x] **Ownership and duplication:** BuildLead makes its own dependency commit. Each boundary has exactly one read-only audit; no commit-only role or duplicate full-suite run is planned. Billing is owner-interactive where the dashboard requires it, and no credential is exposed.
- [x] **Plan eligibility and hard stop:** This document directs only pre-Stage-2 readiness after explicit owner authorization. It names safe blocked states rather than silently changing visibility, plan, domain, default branch, or scope. No Stage 2 action is authorized.
