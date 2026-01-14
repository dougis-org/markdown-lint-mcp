---
description: Analyze a ticket-level plan file to ensure the plan delivers the requirements, covers edge cases, and is sized/structured appropriately for a single implementation bundle.
---

# analyze-ticket Prompt

## ⚠️ MODE ENFORCEMENT

**This prompt requires the `plan-ticket` chatmode to be active.**

If you selected a different chatmode (e.g., `find-next-ticket` or `work-ticket`), please:
1. Switch to `.github/chatmodes/plan-ticket.chatmode.md`
2. Return to this prompt

The chatmode provides execution guardrails; this prompt provides specific analysis workflow.

---

The user input to you can be provided directly by the agent or as a command argument - you MUST consider it before proceeding (if not empty).

User input:

$ARGUMENTS

Goal: Validate a ticket plan produced by `plan-ticket` (persisted to `docs/plan/tickets/{{ISSUE_NUMBER}}-plan.md`) and verify the plan:
- faithfully implements the ticket's acceptance criteria and requirements,
- leaves no uncovered edge cases or test gaps,
- contains a sensible, single deliverable or, if not, provides a deterministic decomposition suggestion.

STRICTLY READ-ONLY: Do not modify any files without explicit user approval. 
Produce a structured analysis report and optional remediation suggestions (do not apply them automatically).
The analysis must be deterministic and repeatable. If the user provides additional context or corrections, incorporate them explicitly.
If the user requests you to update the plan, only then edit the plan file (only files matching `docs/plan/tickets/*-plan.md` should be edited).

Agent Guidelines: Follow the repository agent guidance in `AGENTS.md`. Any conflict with a MUST rule in `AGENTS.md` (for example: mandatory GPG-signed commits, TDD requirement) is CRITICAL and must be reported (not suppressed).

Execution steps:

1. Ticket detection & plan location
   - If a GitHub issue number is provided in input, validate it (pattern `[0-9]+`). If not provided, ask the user for the issue number.
   - Derive PLAN_PATH = `docs/plan/tickets/{{ISSUE_NUMBER}}-plan.md`. If the plan file is missing, abort and instruct the user to run the planning mode.

2. Required artifacts to load (read-only):
   - `PLAN` = PLAN_PATH (required)
   - If referenced in plan or present via `.specify/scripts/bash/check-prerequisites.sh`, also load `FEATURE_DIR/spec.md` and `FEATURE_DIR/tasks.md` (optional but recommended). If the plan references files, load those files when present.
   - Load agent guidelines `AGENTS.md`.

3. Parse the plan file (expect the 11 sections the `plan-ticket` prompt mandates). Extract:
   - Acceptance Criteria (ACs) (normalized, numbered)
   - Traceability map (if present): AC → Requirement → Task(s) → Test(s)
   - File-level change list, Test Plan, Rollout & Monitoring, and Step-by-step TDD plan
   - Any stated assumptions, open questions, and decomposition/slice heuristics in the plan.

4. Build internal models:
   - AC inventory: canonical keys for each AC (slugify the imperative phrase)
   - Requirement/Claim inventory: any REQ- or requirement phrases in the plan
   - Task/Test inventory: tasks and tests named in the plan file
   - File-change inventory: file paths the plan will touch
   - Dependency inventory: external services, migrations, schema changes, feature flags
   - Agent-guidelines rule set: MUST/SHOULD normative statements (from `AGENTS.md`)

5. Detection & validation passes (apply each):
   A. Traceability & Coverage
      - Ensure every AC has at least one mapped test and at least one implementation step (file path or task).
      - Flag ACs that are untestable, ambiguous, or map to no files/tasks/tests.
   B. Edge-case & Acceptance completeness
      - For each AC, infer likely edge cases (null/empty, large payloads, auth failures, concurrency, retries, backward compatibility) and verify plan includes tests/steps for them.
      - Flag missing edge-case coverage.
   C. TDD enforcement
      - Verify the plan follows RED→GREEN→REFACTOR ordering: tests-first steps exist and are explicit for each AC/feature slice.
      - Flag steps that implement behavior before tests are created.
      - **Verify Pre-PR Cleanup Step Present**: Ensure Section 5 includes explicit final step for duplication and complexity review before PR.
        * Must include: duplication review, complexity reduction, dead code removal, static analysis
        * Flag **HIGH** if missing entirely; **MEDIUM** if vague (e.g., "clean up code" without specifics)
   D. File & Task specificity
      - Ensure the plan lists concrete file paths or clearly named placeholders for every implementation step and test addition.
      - Flag vague steps ("update services" without path) as MEDIUM.
   E. Parameterized Test Strategy Compliance
      - **Default expectation**: Tests involving multiple scenarios, input variations, boundary conditions, or edge cases MUST use parameterized tests with external data sources (provider classes, JSON, CSV).
      - Verify Sections 5 & 8 specify:
        * Data source type & location (e.g., `CacheKeyTestDataProvider` class, `test-data/ttl-cases.json`)
        * Justification for simple (non-parameterized) tests
      - Flag violations:
        * **HIGH**: Multiple similar test cases without parameterization (should use data-driven approach)
        * **MEDIUM**: Parameterized tests planned but no data source location specified
        * **LOW**: Simple test without justification (acceptable for: single smoke tests, unique architectural validations, one-time setup/teardown)
   F. Utility Reuse & Duplication Prevention
      - **Default expectation**: Plans must cite and reuse existing utilities (validators, converters, builders, test data providers, helpers) to prevent duplication.
      - Verify Sections 4 & 7 include:
        * Explicit citations of reusable utilities with file paths (e.g., "Reuse `CacheKeyValidator.validate()` from `core/validation/CacheKeyValidator.java`")
        * Justification for new utilities overlapping existing categories (e.g., "Create `PayloadSizeValidator` (no existing size validator; searched `*Validator` classes)")
        * References to existing test infrastructure (test containers, base providers, mock factories)
      - Flag violations:
        * **HIGH**: New validator/converter/builder without search evidence → likely duplication
        * **HIGH**: New test data provider without checking existing `*TestData`/`*TestDataProvider` classes
        * **MEDIUM**: Vague "using existing patterns" without specific file/class/method citations
        * **MEDIUM**: New utility without justification or search evidence
        * **LOW**: Missing file paths for cited utilities (reuse claimed, path not specified)

6. Risk, dependency & rollout validation
   - Verify any migrations/backfills include safe ordering, downtime notes, and rollback steps.
   - Verify feature flags are named, default OFF (unless justified), and rollbackable.
   - Check observability: plan must list metrics, logs, and at least one alert or SLO tied to success criteria.

7. Bundle sizing & decomposition heuristic
   - Decide if plan is a sensible single deliverable. Deterministic heuristics:
     * Split if: >5 distinct ACs with orthogonal scope, >3 independent subsystems (schema, API, UI, worker), or migration + API + rollout + multi-team coordination
     * Keep together if: ACs closely related (same data model, same API surface, small incremental flag-driven behavior)
   - If recommending split, propose decomposition table: Slice Key, Title, Rationale, ACs, Dependencies, Estimated Effort. Map each AC to exactly one slice.

8. Consistency & terminology
   - Detect terminology drift: different names for same entity across plan/spec/tasks.
   - Check for conflicting technology choices inside the plan (e.g., two different libraries or frameworks chosen for the same layer).

9. Agent-guidelines alignment
   - Any plan element violating a MUST from `AGENTS.md` is CRITICAL. Report precise clause (quote the offending line in `AGENTS.md`) and the offending plan line or section.

10. Severity assignment (deterministic):
   - CRITICAL: Violates an Agent-Guidelines MUST (see `AGENTS.md`); plan missing tests for a blocking AC; missing rollback for migrations; plan file missing.
   - HIGH: AC untestable or ambiguous; major edge-case uncovered; plan requires new cross-team coordination not accounted for.
   - MEDIUM: Vague file-level steps; missing non-functional tests (perf/security); TDD order not explicit.
   - LOW: Wording/style, missing minor docs, minor traceability gaps.

11. Output: produce a Markdown analysis report (no file writes). Required sections:
   ### Plan Analysis Report
   | ID | Category | Severity | Location(s) | Summary | Recommendation |
   |----|----------|----------|-------------|---------|----------------|

   Additional sections:
   - Coverage Summary: | AC Key | Has Test? | Has Implementation Step? | Files | Notes |
   - Edge-case Gaps: per-AC inferred-edge-cases missing coverage
   - Parameterized Test Compliance: | Test Category | Parameterized? | Data Source | Issues | Recommendation |
   - Utility Reuse Analysis: | New Utility | Search Evidence? | Existing Alternatives | Duplication Risk | Recommendation |
   - Decomposition Recommendation (if any): table from step 7
   - Agent-Guidelines Alignment Issues (if any)
   - Unmapped Plan Tasks: tasks/tests with no AC mapping
   - Metrics: Total ACs, ACs with tests, ACs with implementation steps, Coverage %, Parameterized test ratio, Utility reuse citations, New utilities (justified vs. unjustified)

12. Next actions (concise):
   - If CRITICAL issues: recommend blocking resolution before `/work-ticket` or implementation.
   - If only medium/low: list prioritized fixes and optional command suggestions (e.g., run `/plan` to update plan file, or `work-ticket` to start slicing after acceptance).

13. Closing question:
   - "Would you like me to suggest concrete remediation edits for the top N issues?" (Do NOT apply automatically.)

Behavioral rules:
- NEVER modify source code, only plan documentation can be changed with user approval.
- NEVER hallucinate missing sections; if absent, state "section missing".
- Make findings deterministic: stable IDs based on category initial + sha1 of normalized finding text truncated to 6 chars (e.g., "T-1-4f2a9c").
- Limit main table to 50 rows; aggregate remainder.
- If zero issues found, emit a success summary with coverage metrics and next-step guidance.

Assumptions & fallback rules:
- If `detect-ticket-mode.sh` is unavailable, accept a JIRA key in input; otherwise abort.
- If referenced files aren't present in workspace, mark warnings but continue analysis on available plan content.

End of prompt.
