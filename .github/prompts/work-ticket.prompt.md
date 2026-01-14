---
description: Execute an approved implementation plan for a GitHub issue.
---

## ⚠️ MODE ENFORCEMENT

**This prompt requires the `work-ticket` chatmode to be active.**

If you selected a different chatmode (e.g., `find-next-ticket`, `plan-ticket`, or `analyze-ticket`), please:
1. Switch to `.github/chatmodes/work-ticket.chatmode.md`
2. Return to this prompt

The chatmode provides execution guardrails; this prompt provides specific implementation workflow.

---

**Goal:** Implement the plan produced by `plan-ticket` with TDD, quality gates, and Jira + branch hygiene.

> This prompt assumes a plan file already exists. If not, run `plan-ticket`.

## Inputs
Required:
- **GitHub issue number:** {{ISSUE_NUMBER}}
Optional:
- **Plan file:** `docs/plan/tickets/{{ISSUE_NUMBER}}-plan.md` (default)
- **Repo root:** current workspace

---
## Mode Guard
```
RESULT=$(scripts/detect-ticket-mode.sh "${USER_INPUT}")
STATUS=$(echo "$RESULT" | jq -r .status)
JIRA_KEY=$(echo "$RESULT" | jq -r .jiraKey)
```
STATUS rules:
- need_ticket → request key & STOP
- plan_mode → ask to switch to planning; abort if yes
- replan_recommended → show issues; STOP until corrected
- ambiguous → ask user (plan/work)
- work_mode → continue

Additional validation:
- Plan file must exist & contain sections 1–10 (11 if present)
- Warn if stale (diagnostics) → require confirmation
- Redirect if user intent is scoping vs coding

---
## Phase 0: Parameters + Plan Load
0.1 Fetch GitHub issue via GitHub API; never ask user to paste ticket unless API unavailable (then record assumption). Validate number format (numeric).
0.2 Load plan; parse sections; fail fast if missing.
0.3 Summarize (Sections 1,3,5) for confirmation.
0.4 If not already in progress, use GitHub API to update issue status and add start comment. If API fails, note fallback and proceed cautiously.

## Phase 2: TDD (RED)
2.1 Unit tests (nominal + boundary + error) 
2.2 Integration tests (containers/mocks) 
2.3 Contract/API tests (OpenAPI variants & error codes) 
2.4 Regression tests (historical bugs) 
2.5 Ensure new tests FAIL (prove validity)

---
## Phase 3: Implement (GREEN)
3.1 Domain / DTOs
3.2 Service interfaces + impls
3.3 Data layer (repos, indexes)
3.4 Controllers / API (validation, auth)
3.5 Config / env vars (+ validation)
3.6 Migrations (backward compatible)
3.7 Feature flag wiring (default OFF)
3.8 Iterate `./gradlew test` until GREEN
3.9 Refactor (no behavior change)

---
## Phase 4: Docs & Artifacts
4.1 Update README / module docs
4.2 Update CHANGELOG
4.3 Update runbooks / dashboards / alerts
4.4 If schema changed:
   - Update schema artifacts + init scripts
   - Update `docs/api/openapi.yaml` & Bruno collection
   - `node scripts/check-schema-drift.js` → PASS

---
## Phase 5: Quality Gates
| Gate | Command / Action | Pass |
|------|------------------|------|
| Build & Unit | `./gradlew test` | All green |
| Integration | `./gradlew integrationTest` (if exists) | Green |
| Contract/API | Contract suite | All validate |
| Lint/Style | All applicable linters (Spotless, ESLint, Markdownlint, etc.) | No blocking issues |
| Schema Drift | `node scripts/check-schema-drift.js` (if schema changed) | No drift |
| Security/Input | Review validation & logging | Safe, no secrets |
| Feature Flags | Confirm default OFF or justified | Documented |
| Coverage | Compare baseline | No unjustified drop |
| **Duplication & Complexity** | **See Phase 5.5 (pre-commit local scan)**; remote analysis post-PR | **Local fixes applied; remote findings remediated** |

Failures → fix root cause (never dilute tests).

---
## Phase 5.5: Pre-Commit Quality Review
**Purpose:** Catch duplication and complexity issues before committing, enabling remediation before PR creation.

### 5.5.1 Duplication Scan
1. **Local scan (before commit):** Use IDE or grep-based tools to identify obvious code duplication within the changeset
   - Search for repeated blocks, similar method signatures, duplicate utility logic
   - Within changeset vs. existing codebase in affected modules
   - Flag for extraction if practical (utilities, helpers, base classes)

2. **Remote analysis (post-PR):** Codacy or similar static analysis tools will provide comprehensive duplication metrics
   - May require cutting the PR to trigger CI/CD analysis
   - Review Codacy results for cross-module duplication, patterns missed in local scan
   - If significant duplication detected: amend commits, push updates, re-analyze

### 5.5.2 Complexity Check
1. **Local complexity assessment (before commit):**
   - Review method line counts (aim <20-30 lines per method; flag >50 lines)
   - Check cyclomatic complexity mentally (nested conditionals, multiple branches)
   - Identify deeply nested logic; flatten where possible (early returns, polymorphism, guards)
   - Look for over-engineering (premature abstractions, unnecessary indirection, speculative generalization)

2. **Remote complexity analysis (post-PR):** 
   - Codacy and linters will report cyclomatic complexity, cognitive complexity, maintainability index
   - May require cutting the PR to trigger analysis
   - If thresholds exceeded: simplify (extract methods, reduce nesting, remove dead code), push updates, re-analyze

### 5.5.3 Quality Gate Summary
| Item | Local Check | Remote Check | Blocker |
|------|------------|--------------|---------|
| Code duplication | Search & extract obvious patterns | Codacy post-PR | Fix if same pattern >3x in changeset |
| Method complexity | Review line counts & nesting | Cyclomatic complexity (post-PR) | Fix if >10-12 cyclomatic complexity |
| Dead code | Remove unused imports, commented blocks | Linter post-PR | Remove all flagged items |
| Over-engineering | Simplify abstractions, flatten logic | Codacy post-PR | Simplify if >7-8 nested levels |

**Note:** Remote analysis may require cutting the PR and waiting for CI/CD results. Local checks should be completed before commit to minimize rework.

---
## Phase 6: Acceptance Verification
6.1 Load ACs (Section 3) 
6.2 Map each AC → tests (unit/integration/contract) 
6.3 Negative & error path spot checks 
6.4 Document deviations (justify or request plan update)

---
## Phase 7: Commit & PR
7.1 `git add .`
7.2 `git commit -S -m "feat(<scope>): {{JIRA_KEY}} <concise summary>"` (use `fix|chore|refactor|docs|test` as appropriate)
7.3 `git push -u origin <prefix>/{{JIRA_KEY}}-short-kebab-summary`
7.4 Open PR (template) including: ticket, plan link, summary, risk (plan §6), rollout (plan §9), test evidence, flag usage
7.5 Request CODEOWNERS & domain reviewers
7.6 Comment PR link in Jira & transition → Code Review

---
## Phase 8: Code Review & Merge
**Purpose:** Address all PR feedback and quality gate failures; complete work only upon successful merge.

### 8.1 Review Feedback & Quality Checks
1. **Monitor PR for:**
   - Reviewer comments (address each substantively; no dismissal without reasoning)
   - Remote quality analysis results (Codacy, linters, security scanners)
   - CI/CD pipeline failures (build, test, coverage, schema drift)
   - Automated checks (branch protection rules, required status checks)

2. **For each comment/failure:**
   - Understand the issue (ask for clarification if ambiguous)
   - Determine root cause (code issue, test gap, configuration, documentation)
   - Fix in code or documentation
   - Commit with `-S` flag and descriptive message (e.g., `chore: address PR feedback on validation logic`)
   - Push to branch (automatically updates PR)
   - Re-run checks if applicable (manual trigger or automatic CI re-run)

3. **Iterate until:**
   - All reviewer comments resolved (or explicitly approved)
   - All CI/CD checks GREEN
   - All quality gates passing (Codacy, linters, coverage, schema drift)
   - No unaddressed blocking issues

### 8.2 Merge Criteria
PR is only eligible for merge when ALL of the following are true:
- ✅ All required status checks passed
- ✅ All reviewer approvals obtained (as per CODEOWNERS)
- ✅ No merge conflicts with base branch
- ✅ All conversations resolved or explicitly dismissed with reasoning
- ✅ Branch is up-to-date with base branch (if required by repo settings)
- ✅ No new TODOs or FIXMEs without ticket references

### 8.3 Merge & Verification
1. Merge PR via GitHub (prefer "Squash and merge" for single logical changeset OR "Create a merge commit" if keeping step history is valuable)
2. Verify merge succeeded and CI/CD pipeline runs on merged commit
3. Monitor for any post-merge failures on main branch
4. If post-merge failure detected, revert & fix root cause, then re-open PR

### 8.4 Workflow Completion Checkpoint
**Only after successful merge to main branch** is the implementation workflow complete and ready to proceed to Phase 9 (Handoff Summary). Until merge is successful, continue iterating in Phase 8.

---
## Phase 9: Handoff Summary (Output)
- Files changed (count + key paths)
- New tests by category
- Flags introduced
- Outstanding risks / mitigations
- Next steps (review → merge → deploy)
- **Merge status:** Confirmed merged to main branch

---
## Error Matrix
| Issue | Action | Phase |
|-------|--------|-------|
| Missing plan section | STOP; request fix | 0 |
| All tests pass in RED | Strengthen tests | 2 |
| Build fail | Fix latest change / revert then retest | 3 |
| Drift fail | Update artifacts → rerun drift check | 4 |
| Jira transition fail | Log + proceed; notify user | 7 |
| Ambiguous instruction | Batch clarifying question | Any |
| PR quality check fails | Address in Phase 8; commit & re-run | 8 |
| Reviewer feedback | Iterate in Phase 8 until resolved | 8 |

Escalate after 2 failed remediation attempts.

---
## Verification Checklist
- [ ] Jira status updated + PR link
- [ ] All new tests added & GREEN
- [ ] Schema artifacts & drift check (if schema)
- [ ] Feature flag(s) documented (default OFF)
- [ ] Pre-commit quality review completed (Phase 5.5): duplication & complexity scanned locally
- [ ] Signed conventional commit(s)
- [ ] PR open & reviewers requested
- [ ] Remote analysis pending (Codacy post-PR); plan to remediate findings
- [ ] Each AC satisfied or deviation documented
- [ ] **PR review complete: all feedback addressed & quality checks passing (Phase 8)**
- [ ] **PR merged to main branch (Phase 8.3)**
- [ ] Handoff summary produced

## Success Criteria
PR merged to main, all quality checks passing, ACs verified, Jira updated, handoff summary delivered.

## Working Rules
- Strict TDD (RED → GREEN → Refactor)
- No scope creep beyond plan
- Reuse existing patterns; cite reused modules
- CONTRIBUTING.md overrides plan
- No production logic without tests
- New behavior behind feature flag unless trivial & low risk

---
## References
- Shared guidance: `.github/prompts/includes/branch-commit-guidance.md`
- Plan schema (optional validation aid): `.github/prompts/includes/plan-file-structure.schema.json`
