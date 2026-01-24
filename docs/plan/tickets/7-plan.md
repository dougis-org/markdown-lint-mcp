# 1) Summary

- **Ticket:** GH-7
- **One-liner:** Fix MCP tools failing due to `markdownlint.*.sync is not a function` errors by making module-loading resilient and adding promise-based fallbacks and tests so `lint_markdown` and `fix_markdown` work under multiple `markdownlint` module shapes.
- **Related milestone(s):** M1 (stability / bugfixes) or NA
- **Out of scope:**
  - Bumping `markdownlint` major version as a separate change (can be follow-up)
  - Large refactor of all rule fixers (only local refactor as needed)
  - Changing supported Node versions

---

# 2) Assumptions & Open Questions

- **Assumptions:**
  - The error originates from runtime `markdownlint` module shape changes (no top-level `sync` available) on Node 25 / ESM interop scenarios.
  - We can and should make the server resilient to both `sync` (legacy) and `promise` (async) APIs rather than pinning the dependency.
  - Adding a small utility module and tests is acceptable in this bugfix.
  - CI runs on Node versions representative of user's environment (we will add a test matrix entry if needed).

- **Open questions (RESOLVED):**
  1. ✅ **Compatibility approach chosen:** Long-term compatibility fix preferred over version pinning for resilience across Node.js versions.
  2. ✅ **No telemetry/callbacks:** Logging only (no privacy-sensitive metrics/callbacks). Simple in-process counter acceptable for debugging.
  3. ✅ **No deep-import fallback:** Deep-import to `markdownlint/lib/markdownlint.mjs` rejected as too brittle. Loader will support only `sync` and `promise` APIs with clear error for unsupported shapes.

---

# 3) Acceptance Criteria (normalized)

1. **AC-1:** `lint_markdown` returns a list of issues for a sample file in CI and local runs (tests assert expected issue text and counts).
2. **AC-2:** `fix_markdown` applies fixable changes and writes the file when `writeFile=true` (integration test with sample file demonstrating at least one change).
3. **AC-3:** Both MCP tools succeed when `markdownlint` export includes `sync` (existing behavior) and when only `promise` is present (mocked unit tests). Tests must cover both shapes.
4. **AC-4:** If neither `sync` nor `promise` is available, an explicit, descriptive error is thrown and an instrumentation counter is incremented; tests assert this behavior.
5. **AC-5:** New tests (unit + integration) are added and initially fail (RED), then pass after implementation (GREEN). Coverage added for server loader utility >= 90% on new code paths.
6. **AC-6:** Logs and a small metric (e.g., `mcp.markdownlint.api_fallback_used`) are emitted when fallback is used.

---

# 4) Approach & Design Brief

- **Current state (key code paths):**
  - `src/server.ts` uses `await import('markdownlint')` and then calls `.sync(...)` in `lintMarkdown`, `fixMarkdown` and re-lints with `.sync(...)`.
  - Errors observed: `markdownlintInit.sync is not a function` and `markdownlintLocal.sync is not a function` in runtime (user-reported Node 25 / MacOS).

- **Proposed changes (high-level):**
  - Add a small helper `src/utils/markdownlint-loader.ts` that encapsulates module import and exposes two methods: `runLint(options)` and `runFix(options)`.
    - **Utility reuse justification:** Searched workspace for existing patterns (`*loader*`, `*Loader*`, `*adapter*`, `*Adapter*`, `src/utils/*`). No existing dynamic-import utilities or API shape detection found. New loader justified as single-responsibility utility for markdownlint API encapsulation.
  - The loader will: (1) dynamic-import `markdownlint`; (2) detect the available API surface (`sync`, `promise`, named export shapes); (3) prefer `sync` if present (low overhead), otherwise use `promise`; (4) provide robust shape normalization and clear error when neither present.
  - Replace direct `markdownlint*.sync(...)` calls in `src/server.ts` with calls to the loader API.
  - Add instrumentation/logging when a fallback is used and when an unsupported shape is detected.
    - **Logger reuse:** Reuse existing `src/utils/logger.ts` for all logging via `logger.warn()` and `logger.info()` calls.

- **Data model / schema:** No schema migrations or DB changes required.

- **APIs & contracts:** No public API changes for MCP tool contracts; server still returns same MCP content structure.

- **Feature flags:** No feature flags required (correctness bugfix with backward compatibility preservation).

- **Config:** No new environment variables or configuration needed.

- **External deps:** None new. Prefer not to add dependencies. If we must deep-import (fragile), clearly document and keep it behind a flag.

- **Backward compatibility strategy:** Preserve behavior if `sync` exists. The loader will prefer `sync` and only use `promise` as needed.

- **Observability:** Add `logger.warn()` messages when fallback to `promise` API is used. Add `logger.info()` for successful detection. Simple in-process counter for debugging (non-intrusive, privacy-safe). Add unit tests asserting log lines are emitted.

- **Security & privacy:** No PII concerns. Ensure file content is not logged. Sanitize file paths in logs (log only basename, not full paths with user directories).

- **Alternatives considered:**
  - Pin `markdownlint` to a previous version (short-term, brittle) — rejected in favor of compatibility.
  - Deep import of internal module (`markdownlint/lib/markdownlint.mjs`) — rejected as too brittle and version-dependent.

---

# 5) Step-by-Step Implementation Plan (TDD)

Phases: RED → GREEN → REFACTOR

1. **Tests (RED)**
   - **Confirm RED phase:** After adding tests, run `npm test` to verify all new tests fail with descriptive "not implemented" or "module not found" errors before proceeding to GREEN phase.
   - Add **unit tests** for loader behavior (`tests/markdownlint-loader.test.ts`):
     - Case A: module with `sync` (simulate returning an object with `sync` that returns expected linting map) → assert `runLint` and `runFix` call `sync` and return expected structure.
     - Case B: module with only `promise` (simulate returning an object with `promise`) → assert `runLint`/`runFix` use `promise` and return expected structure.
     - Case C: module with neither `sync` nor `promise` → assert loader throws a clear `Error` and metric increments.
     - Case D: default vs named export shapes (the loader should correctly detect both `(md).default` and top-level `md`). Use parameterized inputs.
   - Add **integration tests** updating `tests/integration/markdownlint-integration.test.ts` (or extend `tests/integration/server-start.test.ts`): start server and call `lint_markdown` and `fix_markdown` against a sample file to assert end-to-end behavior.
   - For parameterized tests: place JSON fixtures under `tests/test-data/markdownlint-loader/module-shapes.json` per project conventions.
   - **Edge-case tests to add:**
     - Large file handling: Integration test with >10MB markdown file (verify no timeout/memory issues)
     - I/O failure: Mock `writeFile` to throw EACCES or ENOSPC and assert graceful error handling
     - Empty/whitespace-only files: Verify loader handles edge-case content gracefully
     - Concurrent access: Unit test simulating rapid sequential API calls (verify no race conditions)

2. **Implementation (GREEN)**
   - Add `src/utils/markdownlint-loader.ts`:
     - Export `type LoaderShape = { runLint(opts), runFix(opts) }`.
     - Implement detection logic:
       1. dynamic-import `markdownlint` (`const md = await import('markdownlint')`)
       2. normalize to candidate object: `const candidate = (md as any).default ?? md`.
       3. if `candidate.sync` is function → use sync wrapped in try/catch.
       4. else if `candidate.promise` is function → call await `candidate.promise(opts)` with `logger.warn()` notification.
       5. else throw `McpError` with diagnostic message: "Unsupported markdownlint API shape (neither sync nor promise available)".
     - Add logging via `src/utils/logger.ts`: `logger.warn()` when using `promise` fallback, `logger.info()` for successful `sync` detection.
     - Increment simple counter (e.g., `let fallbackCount = 0; fallbackCount++`) for debugging; log count periodically.
     - Export helper functions and types for unit tests.
   - Update `src/server.ts` to replace direct `markdownlint*.sync(...)` calls with `await markdownLintLoader.runLint(...)` / `runFix(...)`.
   - Add defensive tests for old and new flows (unit + integration).

3. **Refactor pass**
   - Ensure small, clear functions (<30 lines where reasonable)
   - Remove duplicates (reuse loader everywhere)
   - Add tests for logging/metrics

4. **Pre-PR duplication & complexity review (MANDATORY)**
   - **Duplication Review:**
     - Search workspace for all `import('markdownlint')` occurrences: `grep -rn "import('markdownlint')" src/ tests/`
     - Verify all direct imports in `src/server.ts` replaced with loader API calls
     - Check for duplicate API detection logic patterns (should only exist in loader)
     - Confirm no commented-out fallback code remains
   - **Complexity Review:**
     - Run complexity analysis on `src/utils/markdownlint-loader.ts`
     - Ensure functions <30 lines where reasonable, cyclomatic complexity <10
     - Verify single-responsibility principle: loader only handles API detection, no business logic
   - **Dead Code Removal:**
     - Search for unused imports, debugging statements, or temporary code
     - Remove any experimental deep-import code paths
     - Clean up console.log statements (use logger only)
   - **Static Analysis:**
     - Run `npm run lint` and resolve all ESLint issues
     - Run `npm run format` to apply Prettier formatting
     - Run `npm test` to verify all tests pass
     - Verify coverage >=90% on new code paths: `npm run test:coverage`
     - Run Codacy analysis per repository rules (if configured)

5. **Docs & artifact updates**
   - Update `CHANGELOG.md` with a brief note: "Fix: Resilient markdownlint module loading (GH-7)".
   - Add short note to `USAGE.md` if needed mentioning Node 20+ compatibility notes.

---

# 6) Effort, Risks, Mitigations

- **Effort:** Small/Medium (S/M). Rationale: ~1 day to write tests + 0.5–1 day to implement loader + 0.5 day for review and CI fixes.

- **Risks & Mitigations:**
  1. **Risk:** `markdownlint` changes again in a future release breaking assumptions.
     - **Mitigation:** Add a clear error message and metrics when neither API present; consider pinning or adding schedule to review dependency on release.
  2. **Risk:** Deep import fallback is brittle and could break across versions.
     - **Mitigation:** Keep it behind a flag (default OFF) and prefer `promise` fallback.
  3. **Risk:** Tests falsely pass due to mocking instead of real behavior.
     - **Mitigation:** Add at least one integration test that uses the actual installed `markdownlint` package in CI environment.

---

# 7) File-Level Change List

- src/utils/markdownlint-loader.ts (NEW):
  - Purpose: Encapsulate module import and provide `runLint` and `runFix` that work for both `sync` and `promise` shapes. Add small metric & logs.

- src/server.ts (MOD):
  - Replace direct calls to `markdownlint*.sync(...)` with the loader API. Keep formatting and error handling consistent.

- tests/markdownlint-loader.test.ts (NEW):
  - Unit tests for loader shapes and error behavior plus parameterized fixtures under `test/test-data/markdownlint-loader/`.

- tests/integration/markdownlint-integration.test.ts (MOD/ADD):
  - Integration test exercising `lint_markdown` and `fix_markdown` end-to-end.

- test/test-data/markdownlint-loader/ (NEW):
  - JSON fixtures for synthetic lint results and edge cases.

- CHANGELOG.md (MOD):
  - Add GH-7 note.

---

# 8) Test Plan

**Parameterized Test Strategy:**
- **Data source location:** `tests/test-data/markdownlint-loader/module-shapes.json`
- **Fixture structure:** JSON file with test case objects:
  ```json
  [
    { "name": "syncShape", "hasSync": true, "hasPromise": false, "hasDefault": false },
    { "name": "promiseShape", "hasSync": false, "hasPromise": true, "hasDefault": false },
    { "name": "defaultExportSync", "hasSync": true, "hasPromise": false, "hasDefault": true },
    { "name": "unsupportedShape", "hasSync": false, "hasPromise": false, "hasDefault": false }
  ]
  ```
- **Test implementation:** Use `describe.each()` or manual iteration over JSON fixtures in `tests/markdownlint-loader.test.ts`
- **Parameterize unit tests for module shapes:** `sync`, `promise`, `(md).default` wrappers, and absent API (4 core scenarios)

**Test Coverage by Category:**
- **Happy paths:** Unit loader tests for `sync` and `promise` using fixtures; integration tests using real `markdownlint` on `sample.md` → `tests/integration/markdownlint-integration.test.ts`.
- **Edge/error cases:** Loader raises meaningful error when API unsupported (unit test). Verify that server surfaces descriptive error to callers (unit/integration).
- **Regression:** Add a test that simulates previous behavior to ensure we don't regress on older `sync` API.
- **Contract:** Test that output format (MCP content) remains unchanged by verifying response text contains expected headings and counts.
- **Performance:** Not applicable (small helper), but include a smoke test for execution time if required.
- **Security/privacy:** Tests assert file contents are not emitted to logs.

**Manual QA checklist:**
- Run server locally and call `lint_markdown` and `fix_markdown` with a known-bad `sample.md`.
- Test in a Node 25 environment (if available) to reproduce original report.
- Toggle deep-import flag (if implemented) to verify behavior.

---

# 9) Rollout & Monitoring Plan

- **Flags:** No feature flags required. Default behavior change (compatibility fix) is enabled immediately upon merge.

- **Deployment steps:**
  1. Merge PR to `bug/7-mcp-action-fails` → main via normal process.
  2. Run CI (unit + integration). If integration passes, publish patch release.

- **Dashboards & metrics:** Add a short-term log and a numeric counter `mcp.markdownlint.api_fallback_used` (log once per process run or increment per request) to detect fallback usage.

- **Alerts:** If fallback count spikes above threshold (e.g., >10 in 5m), page maintainers (manual check) — add as a manual alert for now.

- **Success metrics / KPIs:** 0 occurrences of `*.sync is not a function` errors in Sentry/logs in production after release; integration test pass rate 100%.

- **Rollback procedure:** Revert the PR via `git revert <commit-sha>` and release a patch version. If compatibility issues arise, temporarily pin `markdownlint` to last known-good version (e.g., `0.40.0`) in `package.json` until permanent fix is available.

---

# 10) Handoff Package

- **Issue link:** https://github.com/dougis-org/markdown-lint-mcp/issues/7
- **Branch:** `bug/7-mcp-action-fails` (created)
- **Plan file:** `docs/plan/tickets/7-plan.md`
- **Key commands:**
  - Build/test: `npm install && npm test`
  - Lint/format: `npm run lint && npm run format`
  - Run server locally: `npm run build && node dist/index.js`
- **Known gotchas / watchpoints:**
  - `markdownlint` ESM/CJS shapes may change further — monitor fallback metrics.
  - Ensure tests mock dynamic import appropriately (Jest moduleNameMapper), and that the integration test runs against the installed `markdownlint`.

---

# 11) Traceability Map

| Criterion # | Requirement | Milestone | Task(s) | Flag(s) | Test(s) |
| --- | --- | --- | --- | --- | --- |
| AC-1 | `lint_markdown` returns issues | M1 | Add integration test; update `src/server.ts` to use loader | - | `integration/markdownlint-integration.test.ts` |
| AC-2 | `fix_markdown` applies fixes | M1 | Add integration test; use loader's `runFix` | - | `integration/markdownlint-integration.test.ts` |
| AC-3 | Works with `sync` and `promise` shapes | M1 | Add unit tests; implement loader detection | - | `tests/markdownlint-loader.test.ts` |
| AC-4 | Clear error if unsupported | M1 | Loader throws `McpError`; test counter increment | - | `tests/markdownlint-loader.test.ts` |
| AC-5 | Tests added & pass | M1 | Add tests before implementation (RED → GREEN) | - | Unit + Integration suite |
| AC-6 | Observability when fallback used | M1 | Add metric/logging calls in loader | - | Unit test asserts log/metric |

---

**Next step:** After approval of this plan, I will: (1) add tests (marking the test failures), (2) implement `src/utils/markdownlint-loader.ts`, (3) update `src/server.ts`, (4) run linters and Codacy checks, and (5) open PR from `bug/7-mcp-action-fails` with the plan attached.
