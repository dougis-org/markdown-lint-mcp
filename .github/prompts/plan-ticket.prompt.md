---
description: Build an execution plan for a GitHub issue using TDD and repo context (planning mode).
---

## ⚠️ MODE ENFORCEMENT

**This prompt requires the `plan-ticket` chatmode to be active.**

If you selected a different chatmode (e.g., `find-next-ticket`, `work-ticket`, or `analyze-ticket`), please:
1. Switch to `.github/chatmodes/plan-ticket.chatmode.md`
2. Return to this prompt

The chatmode provides behavioral guardrails; this prompt provides specific implementation steps.

---

**Goal:** Produce a concise, unambiguous implementation plan that a separate engineer/agent can execute without further clarification.

> Output only the plan (no extraneous narrative). Ask clarifying questions ONLY once if blocking gaps exist.

## Inputs

Required:

- GitHub issue number: {{ISSUE_NUMBER}}
  Optional:
- Additional links/refs: {{ADDITIONAL_LINKS_OR_PATHS}}
- Target date / milestone: {{TARGET_DATE_OR_MILESTONE}}

If a URL is provided, extract the issue number (numeric format).

---

## Step 0: Issue Verification & Branch Creation

1. Use the GitHub API to fetch the issue; do NOT ask the user to paste raw ticket details unless the API is unavailable. Confirm number format.
2. Ensure clean workspace (`git status` empty) and sync main:
   - `git checkout main && git pull --ff-only`
3. Determine branch prefix from issue type or default to `feature`.
4. Create or reuse shared issue branch:
   - Use the GitHub MCP server to list branches (`list_branches`) and to create a branch (`create_branch`).
   - `git switch -c <PREFIX>/{{ISSUE_NUMBER}}-short-kebab-summary` (truncate ≤ ~60 chars) OR
   - `git switch <PREFIX>/{{ISSUE_NUMBER}}-short-kebab-summary` if exists.
5. Confirm: "Planning issue #{{ISSUE_NUMBER}} on branch <PREFIX>/{{ISSUE_NUMBER}}-short-kebab-summary".
6. Future GitHub issue updates (e.g., decomposition decisions) must use GitHub API actions—never manual text unless API is unavailable (then note fallback in assumptions).
   (Shared conventions: `.github/prompts/includes/branch-commit-guidance.md`)

7. **Traceability alignment**
    - Map each acceptance criterion to: requirement (or new requirement tag), milestone(s), feature flag(s), test type(s).
    - If creating new requirement tags, add them in the plan file’s summary—not the central plan (a later consolidation step can merge them).

---

## Step 1: Ingest Ticket

Collect: title, description, acceptance criteria (AC), labels, components, links, comments, blockers, dependencies, security/performance notes.
Extract:

- Problem statement
- In-scope vs out-of-scope
- Functional requirements
- Non-functional (perf, security, compliance, availability)
- Dependencies (services, data, other tickets)
- Rollout expectations / flagging
- Success metrics & observability hooks
  Identify ambiguities & contradictions (list succinctly). If critical gaps, batch clarifying questions once, then proceed.

## Step 1.1: Decomposition Heuristic

If multiple separable deliverables (heuristics: >5 ACs, cross-layer changes, schema+API+flag, distinct capabilities), propose Work Breakdown Table:
| Slice | Key | Title | Type | Value | Depends | ACs | Effort (S/M/L) | Risks |
|-------|-----|-------|------|-------|---------|-----|----------------|-------|
Map each original AC to exactly one slice. Recommend: keep vs spin out (justification). Await user confirmation before splitting (no ticket creation here).

---

## Step 2: Repo & Doc Context Scan

Review: `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CHANGELOG.md`, `docs/**`, existing `docs/plan/tickets/*` for related keys.
Identify:

- Relevant modules/packages/classes
- Existing patterns for validation/logging/metrics/errors/retries/config/feature flags
- Similar implementations to reuse
- Existing flags; decide if new flag needed (`spcs.<DOMAIN>.<CAPABILITY>.enabled`, default OFF)
- Architecture layering (controller → service → repo)
- API & schema governance (OpenAPI, migrations)
  Record only items materially affecting design.

## Step 2.5: Utility & Pattern Discovery (Prevent Duplication)

**Goal**: Discover existing reusable code to prevent reinventing utilities.

Systematically search for:

### Production Utilities
- **Validators**: `*Validator.java`, `*Validation.kt`, `validate*` methods
- **Converters/Mappers**: `*Converter`, `*Mapper`, `*Transformer` (domain ↔ DTO, serialization)
- **Builders/Factories**: `*Builder`, `*Factory` patterns
- **Common utilities**: String, date/time, retry, circuit breakers in `**/util/**`, `**/common/**`, `**/shared/**`
- **Error handling**: Exception hierarchies, error builders, standardized codes
- **Feature flags**: Flag evaluation wrappers, config helpers

### Test Infrastructure
- **Test data providers**: `*TestData`, `*TestDataProvider`, `*TestFixtures` in `*/test/**/data/**` or `*/test/**/fixtures/**`
- **Test builders**: `*TestBuilder`, `Test*Factory`
- **Test helpers**: Assertion utils, mock factories in `*/test/**/util/**` or `*/test/**/helpers/**`
- **Integration test infra**: Test containers, embedded services, config classes

### Discovery & Documentation
Use `start_search` for pattern discovery (e.g., `pattern="Validator|Validation"`, `searchType="files"`).

In Section 4 (Approach & Design) and Section 7 (File-Level Change List):
- **Cite reusable utilities**: "Leverage existing `CacheKeyValidator.validate()` from `core/validation/CacheKeyValidator.java`"
- **Justify new utilities**: "Create new `PayloadSizeValidator` (no existing size validator found; searched `*Validator` classes)"
- **Flag potential duplicates**: ⚠️ **Reuse Check Required**: Verify no existing `*TimeoutHandler` before implementing

---

## Step 3: Clarifications (Single Batch)

List only blocking items (privacy, auth roles, error contract, SLA/SLO changes, data retention, rollout cadence, owner approvals). After responses (or assumptions), proceed.

---

## Step 4: Plan Construction

Produce sections 1–11 exactly as specified (below). Each implementation step must cite concrete file paths or new file placeholders. Prefer existing utilities over new ones. Default new runtime behavior behind a flag unless trivial & low risk.
Persist the plan to `docs/plan/tickets/{{ISSUE_NUMBER}}-plan.md` (create directory if missing). The persisted file content MUST match the output sections verbatim.

## Quality Criteria for Plan Output

Before finalizing the plan, validate the following:

| Criterion | Validation | Pass |
|-----------|-----------|------|
| **Decomposition Decision** | Justified reasoning for split or single-ticket approach | ✓ Documented |
| **Reuse Evidence** | All proposed utilities searched & cited with file paths; new utilities justified by search evidence | ✓ Every utility cited or justified |
| **Parameterized Tests** | Explicit data sources cited (providers, JSON, CSV); simple tests reserved for smoke/unique validations | ✓ Strategy clear in Section 8 |
| **Utility Duplication** | No duplicate implementation of existing patterns; pre-PR cleanup step included | ✓ Included in Section 5 |
| **Dependency Graph** | Acyclic & minimal; no circular service dependencies | ✓ No cycles detected |
| **Feature Flags** | All new runtime behavior behind flag (default OFF) unless explicitly justified | ✓ Flag(s) named, defaults documented |
| **Observability** | Success + failure instrumentation per slice; metrics/logs/alerts defined | ✓ Covered in Section 9 |
| **Traceability** | Every AC mapped to requirements, milestones, tasks, flags, tests in Section 11 | ✓ Table complete, no blanks |
| **Rollback Strategy** | Explicit rollback procedure per slice (if applicable) | ✓ Included in Section 9 |
| **Security & Privacy** | Auth/authz, PII handling, input validation, rate limiting addressed | ✓ Covered in Section 4 |

Gaps in any criterion block plan finalization. Remediate or add assumption + note in Section 2.

---

## Required Output Sections

> Replace every ALL-CAPS placeholder (e.g., `<PREFIX>`, `<WHAT AND WHY>`) with concrete ticket-specific content; leaving any placeholder will block work mode.

### 1) Summary

- Ticket: {{JIRA_KEY}}
- One-liner: <WHAT AND WHY>
- Related milestone(s): <MILESTONE IDS OR NA>
- Out of scope: <BULLETS>

### 2) Assumptions & Open Questions

- Assumptions: <BULLETS>
- Open questions (blocking -> need answers) numbered.

### 3) Acceptance Criteria (normalized)

Numbered list (testable, unambiguous).

### 4) Approach & Design Brief

Bullet subsections:

- Current state (key code paths)
- Proposed changes (high-level architecture & data flow)
- Data model / schema (migrations/backfill/versioning)
- APIs & contracts (new/changed endpoints + brief examples)
- Feature flags (name(s), default OFF, kill switch rationale)
- Config (new env vars + validation strategy)
- External deps (libraries/services & justification)
- Backward compatibility strategy
- Observability (metrics/logs/traces/alerts)
- Security & privacy (auth/authz, PII handling, rate limiting)
- Alternatives considered (concise)

### 5) Step-by-Step Implementation Plan (TDD)

Phases (RED → GREEN → Refactor). Enumerate steps with file specificity:

- **Test additions first** (unit, integration, contract, regression) ensuring initial FAIL
  * **Parameterized Test Requirements** (default for all multi-scenario tests):
    - Use external data providers (classes, JSON, CSV) for: multiple input/output combinations, boundary conditions, edge case variations, error conditions, state transitions
    - Data sources: Provider classes in `*/test/**/data/` or `*/test/**/fixtures/`; JSON/CSV in `*/test/resources/test-data/`
    - Cite data source explicitly (e.g., `@MethodSource("provideValidKeys")` → `CacheKeyTestDataProvider.validKeys()`)
    - Reserve simple tests ONLY for: single smoke tests, unique architectural validations, singular setup/teardown
- Incremental implementation order (domain → service → repo → controller/API → migrations → flag wiring)
- Refactor pass (no behavior change)
- **Pre-PR Duplication & Complexity Review** (MANDATORY):
  * Review for duplication (within changeset and against existing code)
  * Extract repeated logic into utilities/helpers
  * Simplify methods: <20-30 lines, reduce cyclomatic complexity, flatten nested conditionals
  * Remove dead code, unused imports, commented blocks
  * Eliminate over-engineering (speculative abstractions, unnecessary indirection, premature optimization)
  * Run static analysis (Codacy, linters), address findings
  * Apply formatters (`./gradlew spotlessApply`)
  * Document remaining complexity with rationale
- Docs & artifact updates (README, CHANGELOG, OpenAPI, drift script)
  Include validation command(s) for schema drift & build.

### 6) Effort, Risks, Mitigations

- Effort (S/M/L + rationale)
- Risks (ranked) with mitigation & fallback per item

### 7) File-Level Change List

`path/to/File.java`: add logic X
(New) `path/to/NewFile.kt`: purpose
Group logically (tests vs production vs docs).

### 8) Test Plan

Categorize tests and specify approach per category:

**Parameterized Test Strategy** (see Section 5 for full requirements):
- Use data provider classes for complex objects/domain-specific fixtures
- Use JSON files for API contracts, request/response samples, config variations
- Use CSV files for tabular boundary cases, numeric ranges, state transitions
- Reserve simple tests for singular smoke tests, unique architectural validations, lifecycle hooks

**Test Coverage by Category:**
- Happy paths: [parameterized source location OR simple with justification]
- Edge/error cases: [parameterized source location OR simple with justification]
- Regression: [parameterized source location OR simple with justification]
- Contract: [parameterized source location OR simple with justification]
- Performance (if relevant): [specify approach]
- Security/privacy: [specify approach]
- Manual QA checklist: [list items]

### 9) Rollout & Monitoring Plan

- Flag(s) & default state
- Deployment steps (progressive enable / canary)
- Dashboards & key metrics
- Alerts (conditions + thresholds)
- Success metrics / KPIs
- Rollback procedure (exact commands/steps)

### 10) Handoff Package

- Jira link
- Branch & (future) PR name
- Plan file path
- Key commands (build/test/drift)
- Known gotchas / watchpoints

### 11) Traceability Map

| Criterion # | Requirement | Milestone | Task(s) | Flag(s) | Test(s) |
| ----------- | ----------- | --------- | ------- | ------- | ------- |
|-------------|-------------|-----------|---------|---------|---------|
| 1 | REQ-... | M4 | TASK-004B | spcs.rest_api.enabled | Unit+Integration |

Every AC row filled (no blanks). Tasks reference milestone IDs if applicable.

---

## Working Rules

(See `.github/prompts/includes/branch-commit-guidance.md` for branch & commit hygiene.)

- Do NOT implement production code here.
- Challenge ambiguities; make ≤2 explicit assumptions if still unresolved.
- Reuse existing patterns & utilities; avoid speculative abstractions.
- Signed commits (-S) with conventional format when committing the plan.
- New runtime behavior behind feature flag unless justified.
- Keep plan deterministic, minimal, test-driven, traceable.
- Dependency versions: If referencing an existing dependency, default to the version already declared in the project. For any new dependency (plugin, library, tool) required by the ticket, use the Context7 MCP server to resolve and retrieve the latest stable release version at plan time; cite that version explicitly in the plan (pin it) and note the retrieval date. If Context7 is unavailable, add an assumption and specify a placeholder `LATEST` tag to be resolved during implementation.
- Scope limit: Once the plan is fully accepted (all sections complete, no open blocking questions) and the plan file is committed & pushed, this planning session terminates. Do not proceed to implementation steps here; direct any further work to the `work-ticket` prompt and clear transient context.

## Commit & Push (after writing plan file)

```
git add docs/plan/tickets/{{JIRA_KEY}}-plan.md
git commit -S -m "chore(plan): {{JIRA_KEY}} add implementation plan"
git push -u origin <PREFIX>/{{JIRA_KEY}}-short-kebab-summary
```

Open PR referencing the plan file; request CODEOWNERS.

## Sanity Checklist (mentally tick)

- ACs testable & mapped
- Each step has concrete file path(s)
- Risks have mitigation + fallback
- Observability & security addressed
- Feature flag(s) named & default OFF (or justification)
- Traceability table complete
- Plan file persisted at correct path

## Output Instruction

Return ONLY the 11 sections in order (no extra commentary). If blocking gaps remain after the one clarification batch, list them in Section 2 and proceed with explicit assumptions.
