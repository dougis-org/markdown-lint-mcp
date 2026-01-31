# Implementation Plan: Issue #16 - Fix MCP Error for Unsupported markdownlint API Shape

## 1) Summary

- **Ticket**: #16
- **One-liner**: Fix MCP `lint_markdown` tool to correctly import and invoke the markdownlint 0.40.0 ESM API, resolving "Unsupported markdownlint API shape" errors.
- **Related milestone(s)**: None (critical bug fix)
- **Out of scope**:
  - Upgrading markdownlint to versions beyond 0.40.0 (defer to separate ticket)
  - Refactoring rule implementations
  - Adding new linting rules

## 2) Requirements

- The MCP tool `mcp_markdownlint_lint_markdown` must succeed for valid Markdown file paths on supported platforms (including the Windows repro in the issue).
- The loader must support markdownlint 0.40.0 ESM subpath exports:
  - Preferred: `markdownlint/sync`
  - Fallback: `markdownlint/promise`
- Failure modes must be actionable:
  - Do not crash the server
  - Log which import(s) were attempted and why they failed
  - Return an MCP error message that makes the root cause debuggable
- No breaking changes to server public methods or MCP tool signatures.

## 3) Acceptance Criteria

1. **MCP lint_markdown tool succeeds**: Calling `mcp_markdownlint_lint_markdown` with a valid Markdown file path returns linting issues (no "Unsupported API shape" error).
2. **Sync API used by default**: `runLint()` and `runFix()` use the sync API from `markdownlint/sync` when available.
3. **Async fallback functional**: If sync import fails, gracefully fall back to `markdownlint/promise` (async API) with appropriate logging.
4. **Error handling robust**: Parse/import errors do not crash the server; failures are logged and reported to the MCP client with actionable error details.
5. **Backward compatibility preserved**: No changes to `MarkdownLintServer` public methods or MCP tool signatures; existing callers unaffected.
6. **Tests passing**: All existing and new tests pass; unit coverage maintained.
7. **No performance regression**: Sync API usage maintains or improves response times for linting operations.
8. **Logging clarity**: Debug/warn logs distinguish between sync usage, fallback attempts, and failures for observability.

## 4) Implementation Design

### Current state (key code paths)

- `src/utils/markdownlint-loader.ts`: loader attempts to detect top-level module export shapes (`.sync`, `.promise`, callable default, etc.).
- Issue: markdownlint 0.40.0 exposes ESM subpath exports (`markdownlint/sync`, `markdownlint/promise`) rather than properties on a single module object.

### Proposed changes

1. Refactor the loader to attempt direct ESM subpath imports in priority order:
   - Import `markdownlint/sync` first.
   - If unavailable or missing a `lint` export, fall back to `markdownlint/promise`.
   - Optional last resort: keep legacy shape detection only if needed for backwards compatibility within this repo.
2. Update `runLint()` and `runFix()` to support both code paths:
   - Sync: call `lint()` from `markdownlint/sync`.
   - Async: call `lint()` from `markdownlint/promise` and await.
3. Error reporting:
   - Aggregate the errors from each attempted import path.
   - Throw a single error that includes which paths were attempted and the root error messages.

### API & compatibility

- No new MCP tools or changes to existing tool contracts.
- No public API changes to `MarkdownLintServer` or tool signatures.

### Security & privacy

- No new security considerations; markdownlint has no network access.

## 5) Test Plan & Pre-Commit Quality Review

### TDD steps (RED → GREEN → REFACTOR)

1. RED: Add/adjust tests that demonstrate the current failure (“Unsupported markdownlint API shape”).
2. GREEN: Implement the loader changes to make the tests pass with sync-first and async fallback.
3. REFACTOR: Remove dead code/legacy branches that are no longer used, while keeping tests green.

### Parameterized unit tests (required)

Because the loader behavior is a small scenario matrix, tests should be parameterized with an external data source.

- Data source: `tests/test-data/markdownlint-loader-cases.json`
- Schema (example):
  - `name` (string)
  - `syncImport` (`"ok" | "throw" | "missingLint"`)
  - `asyncImport` (`"ok" | "throw" | "missingLint"`)
  - `expectedPathUsed` (`"sync" | "async" | "error"`)
  - `expectsFallbackCountIncrement` (boolean)
  - `expectsErrorSubstring` (string | null)

Test categories:

- Sync import succeeds → result returned, sync chosen, no fallback increment.
- Sync import throws → async fallback succeeds → result returned, fallback incremented.
- Sync missing `lint` export → async fallback succeeds → result returned.
- Both paths fail → throws with actionable error containing attempted import paths.

### Windows parity coverage

- Add an explicit integration/usage check that exercises Windows-style paths in the same way users do.
  - If CI supports it, include a Windows runner job (Node 20/22) that calls the MCP tool with a real file on disk.
  - If CI does not support Windows yet, document a manual Windows verification step and add a follow-up ticket to extend CI.

### Performance evidence (repeatable)

- Add a repeatable timing check for linting a representative Markdown string (or file) and record baseline in the PR description.
- At minimum: capture timings for sync path and ensure async fallback remains “acceptable” (define a threshold) and is only used when sync unavailable.

### Pre-commit quality review (explicit final step)

Before opening a PR, explicitly run a cleanup pass:

- Duplication review (intra-file + cross-file).
- Complexity reduction (keep functions small, avoid deep nesting).
- Dead code removal.
- Static analysis gates: `npm test`, `npm run lint`, `npm run build`.

Reference checklist: `.github/prompts/includes/pre-commit-quality-review.md`.

## 6) Risk & Rollout

### Risks & mitigations

| Risk | Severity | Mitigation | Fallback |
|------|----------|-----------|----------|
| ESM subpath import not available on a supported runtime | Medium | Confirm supported Node versions; test Node 20/22 in CI | Async fallback activates; if both fail, return actionable error |
| markdownlint API changes unexpectedly | Low | Lock to 0.40.0; add a real-module integration check | Fail fast with clear “unsupported API” error |
| Test mocks don’t match real API | Low | Add an integration test using the real `markdownlint` from `node_modules` | Keep mocks minimal; prefer shape-level assertions |

### Rollout

1. Merge PR.
2. CI gates green.
3. Release a patch version.

### Rollback

- Revert to previous release version if necessary.
- If environment-specific, reinstall dependencies and revalidate loader import behavior.

## 7) Observability

- Logs:
  - INFO: which API is used (sync vs async fallback).
  - WARN: sync unavailable, attempting fallback.
  - ERROR: all import paths failed (include attempted paths and error summaries).
- Metrics / counters:
  - Count invocations of lint tool.
  - Track async fallback count (existing counter).
- Alerts:
  - Critical: any occurrence of "Unsupported markdownlint API shape" after rollout.
  - Warning: sustained non-zero fallback count.

## 8) Effort & Dependencies

- Effort: **Small (S)** — focused refactor + test updates.
- Dependencies:
  - `markdownlint@0.40.0` (existing)
  - Node.js 20+ (assumed supported)

## 9) Open Questions / Assumptions

Assumptions:

- markdownlint 0.40.0 is the target version.
- ESM subpath exports are the supported upstream API.
- Sync API is preferred for deterministic behavior and performance; async is fallback only.

Open questions:

- Repository does not currently contain a top-level `AGENTS.md` file. Canonical guidance appears to live under `.github/agents/`. Consider adding `AGENTS.md` in a separate ticket.

## 10) Related Tickets

- GitHub Issue: https://github.com/dougis-org/markdown-lint-mcp/issues/16
- Follow-up (recommended): add repo-root `AGENTS.md` (or update prompts to reference `.github/agents/*`).
- Follow-up (recommended): add Windows CI coverage for MCP tool invocation if not already present.

## 11) Decomposition

N/A — single cohesive deliverable (loader import strategy + tests + logging).

---

## Appendix A: File-Level Change List

| File | Change |
|------|--------|
| `src/utils/markdownlint-loader.ts` | Refactor loader to use `markdownlint/sync` with fallback to `markdownlint/promise`; improve error aggregation/logging. |
| `tests/markdownlint-loader.test.ts` | Replace top-level markdownlint mocks with subpath mocks; implement parameterized tests driven by external data. |
| `tests/test-data/markdownlint-loader-cases.json` | New: scenario matrix for parameterized tests. |
| `CHANGELOG.md` | Add entry documenting fix for Issue #16. |

## Appendix B: Traceability Map

| AC # | Requirement | Task(s) | Test(s) |
|------|-------------|---------|---------|
| 1 | MCP lint succeeds | Implement ESM subpath import | Integration: real tool call (incl. Windows parity) |
| 2 | Sync default | Implement sync import + selection | Parameterized unit case: sync ok |
| 3 | Async fallback | Implement async fallback | Parameterized unit case: sync fails, async ok |
| 4 | Robust errors | Aggregate errors + log | Parameterized unit case: both fail; assert error message |
| 5 | Backcompat | No signature changes | Regression checks around `lintMarkdown`/`fixMarkdown` |
| 6 | Tests passing | Update mocks + data | Full suite green |
| 7 | No perf regression | Prefer sync | Repeatable timing check |
| 8 | Logging clarity | Add log branches | Optional log assertion or manual debug verification |
