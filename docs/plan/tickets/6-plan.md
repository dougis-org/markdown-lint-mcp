# Implementation Plan: Issue #6 - Add Configuration File Format Support

## 1) Summary

- **Ticket**: #6
- **One-liner**: Extend `loadConfiguration()` to support `.markdownlint.json`, `.markdownlint.yaml`, and `.markdownlint.yml` formats, enabling flexible linting configuration alignment with user guidelines.
- **Related milestone(s)**: None (unscheduled)
- **Out of scope**:
  - Supporting `.markdownlintignore` patterns
  - Environment variable config overrides
  - Remote config URL fetching
  - Config validation/schema enforcement (beyond JSON/YAML parse errors)

---

## 2) Assumptions & Open Questions

**Assumptions:**
- Configuration file lookup priority (if multiple formats exist in same directory): `.markdownlint.json` > `.markdownlint.yaml` > `.markdownlint.yml` (highest to lowest)
- YAML parsing uses industry-standard `js-yaml` library (already or will be added to dependencies) and must use safe parsing options (e.g., `yaml.load(content, { schema: yaml.DEFAULT_SAFE_SCHEMA })`) to avoid executing or interpreting unsafe constructs. Unit tests will assert malicious YAML constructs are not executed and are handled as parse errors or safely ignored.
- All three formats must parse to identical `MarkdownlintConfig` TypeScript interface
- Existing security constraints (workspace boundary, symlink checks) apply to all formats
- Current behavior (fallback to defaults on parse error) is maintained for all formats

**Open questions (none blocking):**
- None; issue constraints are clear

---

## 3) Acceptance Criteria (normalized)

1. **Multiple format support**: `loadConfiguration()` successfully loads and parses `.markdownlint.json`, `.markdownlint.yaml`, and `.markdownlint.yml` files
2. **Priority resolution**: When multiple config formats exist in the same directory, the function attempts `.markdownlint.json` first, then `.markdownlint.yaml`, then `.markdownlint.yml` (first found wins)
3. **YAML parsing**: YAML files are correctly parsed into `MarkdownlintConfig` object matching JSON structure
4. **Error resilience**: Parse errors (invalid JSON/YAML) gracefully fall back to default config without throwing
5. **Security maintained**: Symlink and workspace boundary checks apply equally to all formats
6. **Backward compatibility**: Existing `.markdownlint.json` workflow unchanged; no breaking changes to API
7. **Test coverage**: Unit tests validate all three formats (happy path + error cases); security tests extended to cover YAML paths
8. **Documentation**: README updated with config format examples

---

## 4) Approach & Design Brief

### Current state (key code paths)
- `src/utils/file.ts`: `loadConfiguration(directory)` function reads `.markdownlint.json` only
- Workspace boundary check: realpath-based validation to prevent directory traversal
- Symlink resolution: ensures links don't escape workspace root
- Error handling: catch-all returns `DEFAULT_CONFIG`
- Usage: called from `src/server.ts` in `lintMarkdown()` and `fixMarkdown()` methods

### Proposed changes (high-level architecture & data flow)
1. **Extend `loadConfiguration()`** to support format discovery:
   - Attempt to read configs in priority order: `.markdownlint.json` → `.markdownlint.yaml` → `.markdownlint.yml`
   - First readable file wins; fallback to defaults if all missing or all unparseable

2. **Create `src/utils/config-parser.ts`** helper module:
   - `parseJsonConfig(content: string): MarkdownlintConfig` — parse JSON, throw on error
   - `parseYamlConfig(content: string): MarkdownlintConfig` — parse YAML, throw on error
   - Encapsulate format-specific parsing logic

3. **Dependency**: Add `js-yaml` (latest stable) to `package.json`

### Data model / schema (migrations/backfill/versioning)
- No database or schema changes; all formats map to existing `MarkdownlintConfig` TypeScript interface
- YAML config structure mirrors JSON structure exactly (same keys and values)

### APIs & contracts (new/changed endpoints + brief examples)
- **No new MCP tools** — `get_configuration()` remains unchanged (returns current config in use)
- Function signature unchanged: `loadConfiguration(directory: string): Promise<MarkdownlintConfig>`
- Internal refactor only

**Example YAML config** (`.markdownlint.yaml`):
```yaml
default: true
MD013:
  line_length: 120
MD033: false
MD041: false
```

Equivalent JSON (`.markdownlint.json`):
```json
{
  "default": true,
  "MD013": { "line_length": 120 },
  "MD033": false,
  "MD041": false
}
```

### Feature flags
- No runtime feature flag needed (backward-compatible enhancement)

### Config (new env vars + validation strategy)
- No new environment variables
- Config file discovery automatic; no manual user configuration required

### External deps (libraries/services & justification)
- **js-yaml** (latest stable ~4.1.x): Standard YAML parser for Node.js; lightweight, well-maintained, no breaking changes in recent versions
  - Justification: Only widely-used YAML library compatible with Node.js ESM (required for this project's ESM build)

### Backward compatibility strategy
- Fully backward compatible: existing JSON configs work unchanged
- New YAML support is opt-in (user adds `.yaml`/`.yml` files if desired)
- No API changes to `loadConfiguration()` signature or return type

### Observability (metrics/logs/traces/alerts)
- Add debug-level logs when detecting config file format:
  - `logger.debug('Loading markdown config from .markdownlint.json')`
  - `logger.debug('Loading markdown config from .markdownlint.yaml')`
  - `logger.debug('Loading markdown config from .markdownlint.yml')`
  - `logger.debug('No markdown config file found; using defaults')`
- Existing error logging preserved (parse failures logged at error level)

### Security & privacy (auth/authz, PII handling, rate limiting)
- **Path validation**: Reuse existing workspace boundary checks for all formats
- **Symlink handling**: Apply existing realpath resolution to YAML paths
- **Input parsing**: Both JSON and YAML parsing use safe standard libraries (no code execution risk)
- **No PII concern**: Config files contain only linting rules, no user data

### Alternatives considered
1. **Single monolithic parser function**: Rejected in favor of separate `config-parser.ts` module for testability and clarity
2. **Automatic format detection by file content** (no extension check): Rejected as error-prone; explicit extensions preferred per markdownlint convention
3. **Config cascade** (merge multiple formats): Out of scope; priority-based single-file approach simpler and aligns with markdownlint ecosystem

---

## 5) Step-by-Step Implementation Plan (TDD)

### Phase 1: Tests (RED state)

#### 1.1 Unit tests for format parsing (src/utils/config-parser.ts not yet created)

**File:** `tests/utils/config-parser.test.ts`
- Create parameterized tests for JSON, YAML (`.yaml`), YAML (`.yml`) parsing
- **Parameterized data source**: `tests/test-data/config-samples/` directory with sample configs
  - `valid-config.json`, `valid-config.yaml`, `valid-config.yml` (identical content)
  - `malformed-config.json`, `malformed-config.yaml`, `malformed-config.yml` (intentional parse errors)
- Expected behavior: parsers convert all valid formats to identical `MarkdownlintConfig` objects
- Error cases: throws `Error` on malformed input

**Test categories:**
- **Happy path (parameterized)**:
  - Each format parses to correct object shape
  - Custom rules (e.g., `MD013: { line_length: 140 }`) preserved
  - Boolean rules (e.g., `MD033: false`) preserved
- **Error cases (parameterized)**:
  - Invalid JSON throws
  - Invalid YAML throws
  - Empty config files handled
- **Edge cases (parameterized / simulated)**:
  - File permission errors (simulate `fs.readFile` permission denied and ensure fallback to defaults)
  - BOM and non-UTF-8 encodings (ensure parsing behavior and graceful fallback)
  - Extremely large config files (ensure parser performance and predictable error handling) 

#### 1.2 Integration tests for loadConfiguration (extended)

**File:** `tests/utils/file.test.ts` (add new test cases)
- Test format discovery with multiple files present
- Test priority: JSON > YAML > YML
- Test path safety for all formats
- Test symlink rejection for YAML/YML files

**Test approach (parameterized via provider):**
- Provider: `ConfigFormatTestDataProvider` class in `tests/test-data/config-samples/ConfigFormatTestDataProvider.ts`
  - Returns array of test cases: `{ format: string, filename: string, content: string, expectedConfig: MarkdownlintConfig }`
  - Covers: `.json`, `.yaml`, `.yml`

#### 1.3 Security tests for YAML/YML paths

**File:** `tests/utils/file.test.ts` (add new test cases)
- Symlink escape attempts with YAML files fail (matching JSON behavior)
- Workspace boundary checks apply to YAML/YML
- Relative path rejection applies to all formats
- Malicious YAML constructs (e.g., crafted anchors/aliases or tags meant to execute or instantiate objects) are not executed; parsing uses safe schema and such payloads either result in parse errors or are safely handled
- Permission/encoding edge cases: simulate permission denied and non-UTF-8/BOM files to verify fallback to defaults and stable error handling

### Phase 2: Implementation (GREEN state)

#### 2.1 Add dependency

**File:** `package.json`
- Add `"js-yaml": "^4.1.0"` to `dependencies`
- Run `npm install` to lock version in `package-lock.json`
- Immediately run Codacy's Trivy scan and halt on vulnerabilities: `codacy_cli_analyze --rootPath <repo-root> --tool trivy`. If vulnerabilities are detected, stop further implementation until mitigations (pin to a secure version, apply patches, or remove/replace dependency) are applied and re-scanned. Document the scan results in the PR description.
- After code changes are committed, run `codacy_cli_analyze --rootPath <repo-root>` (default checks) and fix any issues flagged before merging

#### 2.2 Create config parser utility

**File:** `src/utils/config-parser.ts` (new)
- Export `parseJsonConfig(content: string): MarkdownlintConfig`
  - `return JSON.parse(content) as MarkdownlintConfig`
  - Let JSON.parse throw on malformed input
- Export `parseYamlConfig(content: string): MarkdownlintConfig`
  - Import `yaml` from `js-yaml`
  - `return yaml.load(content, { schema: yaml.DEFAULT_SAFE_SCHEMA }) as MarkdownlintConfig` (use safe schema/options to avoid unsafe custom tags or execution)
  - Let yaml.load throw on malformed input
- Export `detectAndParseConfig(filename: string, content: string): MarkdownlintConfig`
  - Route by file extension: `.json` → parseJsonConfig, `.yaml`/`.yml` → parseYamlConfig
  - Throw if unrecognized extension

#### 2.3 Extend loadConfiguration()

**File:** `src/utils/file.ts`
- Import `parseJsonConfig`, `parseYamlConfig`, `detectAndParseConfig` from `./config-parser.js`
- Refactor config file lookup loop:
  ```typescript
  const configFilenames = [
    '.markdownlint.json',
    '.markdownlint.yaml',
    '.markdownlint.yml'
  ];
  for (const filename of configFilenames) {
    const configPath = path.join(resolvedReal, filename);
    try {
      await fs.access(configPath);
      const content = await fs.readFile(configPath, 'utf8');
      const config = detectAndParseConfig(filename, content);
      logger.debug(`Loaded markdown config from ${filename}`);
      return config;
    } catch (err) {
      logger.debug(`Could not load ${filename}: ${err instanceof Error ? err.message : 'unknown error'}`);
      // Continue to next format
    }
  }
  // All formats exhausted, return defaults
  return { ...DEFAULT_CONFIG };
  ```
- Maintain existing workspace boundary checks

### Phase 3: Refactor (no behavior change)

#### 3.1 Code quality review
- Extract repeated workspace validation into reusable `validateDirectoryInWorkspace(directory: string)` helper if duplicated
- Remove dead code or over-complex path logic
- Simplify error messages for consistency

#### 3.2 Run formatters and linters
- `npm run format` — auto-fix style issues
- `npm run lint` — verify ESLint compliance
- Codacy scan via CI

### Phase 4: Pre-PR duplication & complexity review

#### 4.1 Duplication scan
- Search for duplicate path validation logic → extract if found
- Search for duplicate format detection → ensure all uses call `detectAndParseConfig`

#### 4.2 Complexity check
- `loadConfiguration()` final cyclomatic complexity target: <8 (simple linear loop)
- `parseYamlConfig()` target: <5 (single function call + cast)
- No over-abstraction; keep utilities minimal

#### 4.3 Static analysis
- Run Codacy analysis on `src/utils/config-parser.ts` and `src/utils/file.ts`
- Fix any flagged issues (unused imports, unreachable code, etc.)

---

## 6) Effort, Risks, Mitigations

**Effort:** Medium (M)
- Rationale: Config parsing itself is simple; main effort is test coverage for three formats + security validation

**Risks (ranked):**

| Rank | Risk | Impact | Likelihood | Mitigation | Fallback |
|------|------|--------|------------|-----------|----------|
| 1 | YAML parsing edge cases (special chars, quoted strings, anchors/aliases) | Config silently misinterpreted | Medium | Use test provider with 10+ YAML edge cases from js-yaml docs | Default config on parse error (existing fallback) |
| 2 | js-yaml dependency vulnerabilities | Supply-chain risk | Low | Codacy security scan (Trivy) post-npm install; pin to stable 4.1.x | Remove dependency, revert to JSON-only |
| 3 | Workspace boundary bypass via YAML symlink | Security regression | Low | Extend existing symlink tests to all formats; test realpath on `.yaml`/`.yml` | Additional security review before merge |
| 4 | Format priority confusion (user expects different order) | Usability issue | Low | Document priority order clearly in README + code comments | No runtime cost; user edits config file order manually |

---

## 7) File-Level Change List

**Production Code:**

- `src/utils/config-parser.ts` (new): Config parsing utilities for JSON, YAML
- `src/utils/file.ts`: Extend `loadConfiguration()` to support multiple formats

**Test Code:**

- `tests/utils/config-parser.test.ts` (new): Unit tests for parsing functions
- `tests/utils/file.test.ts`: Add format discovery and extended security tests
- `tests/test-data/config-samples/` (new directory): Sample config files for parameterized tests
  - `valid-config.json`, `valid-config.yaml`, `valid-config.yml`
  - `malformed-config.json`, `malformed-config.yaml`, `malformed-config.yml`
- `tests/test-data/config-samples/ConfigFormatTestDataProvider.ts` (new): Parameterized test data provider class

**Dependencies & Config:**

- `package.json`: Add `js-yaml` dependency
- `package-lock.json`: Lock js-yaml version post-install

**Documentation:**

- `README.md`: Add section documenting `.markdownlint.json`, `.markdownlint.yaml`, `.markdownlint.yml` formats with examples
- `CHANGELOG.md`: Update with new feature entry

---

## 8) Test Plan

### Test Coverage by Category

**Parameterized Test Strategy:**
- **Config parsing (happy paths)**: External data provider class `ConfigFormatTestDataProvider` with test matrix covering all three formats, multiple rule configurations, edge-case values
- **Config parsing (error cases)**: JSON/YAML files with intentional parse errors (malformed brackets, invalid YAML syntax, etc.)
- **Format discovery**: Parameterized tests varying which files are present; verify priority order
- **Security (path validation)**: Existing symlink/boundary tests extended to YAML files
- **Edge cases**: Empty config files, deeply nested rule objects, YAML anchors/aliases

**Data Source Location:**
- Config samples: `tests/test-data/config-samples/*.{json,yaml,yml}`
- Provider class: `tests/test-data/config-samples/ConfigFormatTestDataProvider.ts`
  - Exports: `validConfigs()`, `malformedConfigs()`, `formatPriorityTestCases()`
- Repository search performed: no existing `*TestDataProvider` or `*TestData` utilities were found under `tests/` or `__tests__`. Adding `ConfigFormatTestDataProvider` is therefore acceptable (cite this in PR).

**Test Suite Breakdown:**

| Category | Type | Data Source | Approach |
|----------|------|-------------|----------|
| Parse JSON (happy) | Unit | Provider class | Parameterized: @MethodSource("validConfigs") filtering `.json` |
| Parse YAML (happy) | Unit | Provider class | Parameterized: @MethodSource("validConfigs") filtering `.yaml` |
| Parse YML (happy) | Unit | Provider class | Parameterized: @MethodSource("validConfigs") filtering `.yml` |
| Parse errors | Unit | Provider class | Parameterized: @MethodSource("malformedConfigs") |
| Format discovery (multiple files) | Integration | Temporary test dirs | Parameterized: create multiple config files, verify priority |
| Symlink security (YAML/YML) | Security | Workspace test sandbox | Extend existing symlink test to all formats |
| Boundary validation (YAML/YML) | Security | Workspace test sandbox | Extend existing boundary test to all formats |

**Manual QA Checklist:**
- [ ] Create `.markdownlint.yaml` in test project; verify linting uses it
- [ ] Create both `.markdownlint.json` and `.markdownlint.yaml`; verify JSON takes priority
- [ ] Intentionally malform a YAML file; verify fallback to defaults (no crash)
- [ ] Test with complex YAML (nested objects, arrays); verify rule application

---

## 9) Rollout & Monitoring Plan

**Feature flags:** None required (backward-compatible enhancement)

**Deployment steps:**
1. Merge PR to main
2. Semantic-release detects `feat:` commit type → bumps version (minor)
3. Package auto-publishes to npm
4. Users update to new version; no configuration changes needed
5. Users optionally add `.markdownlint.yaml` or `.markdownlint.yml` files to leverage new formats

**Dashboards & key metrics:**
- No runtime dashboards needed (config is read once per tool invocation)
- Monitor npm package download trends (post-release)

**Alerts:** None required (not a runtime service)

**Success metrics / KPIs:**
- PR review passes all CI checks (tests, linting, Codacy security scan)
- npm package publishes without errors
- Issue #6 closed upon merge

**Rollback procedure:**
- If critical security issue detected in js-yaml:
  1. Remove js-yaml dependency from package.json
  2. Revert `loadConfiguration()` to JSON-only via git revert
  3. `npm install` to remove js-yaml from node_modules
  4. Publish patch release (rollback detected via semantic-release commit message)
  5. Close issue with note on unsupported formats

---

## 10) Handoff Package

- **Jira link**: https://github.com/dougis-org/markdown-lint-mcp/issues/6
- **Branch**: `feat/6-config-file-formats`
- **Plan file path**: `docs/plan/tickets/6-plan.md`
- **Key commands**:
  - Build: `npm run build`
  - Test: `npm run test`
  - Test watch: `npm run test:watch`
  - Lint: `npm run lint`
  - Format: `npm run format`
- **Known gotchas**:
  - YAML files are whitespace-sensitive; test carefully with indentation
- Use js-yaml safely: prefer `yaml.load(content, { schema: yaml.DEFAULT_SAFE_SCHEMA })` (do not enable `eval` or unsafe custom tags). Include a unit test that validates malicious YAML payloads do not execute or affect runtime state.
- After adding `js-yaml`, run `codacy_cli_analyze --rootPath <repo-root> --tool trivy` and address any vulnerabilities before continuing
  - Symlink tests may be flaky on Windows; check CI logs if failures occur
  - **Agent guidance note**: The repository currently lacks a top-level `AGENTS.md`. Canonical agent guidance is available at `.github/agents/plan-ticket.agent.md`; consider adding `AGENTS.md` to the repo root or referencing `.github/agents/` in the README for discoverability.

---

## 11) Traceability Map

| Criterion # | Requirement | Milestone | Task(s) | Flag(s) | Test(s) |
|-------------|-------------|-----------|---------|---------|---------|
| 1 | Support `.markdownlint.json` format | None | impl-2.3, test-1.1 | N/A | config-parser.test.ts (JSON) |
| 2 | Support `.markdownlint.yaml` format | None | impl-2.2, impl-2.3, test-1.1 | N/A | config-parser.test.ts (YAML) |
| 3 | Support `.markdownlint.yml` format | None | impl-2.2, impl-2.3, test-1.1 | N/A | config-parser.test.ts (YML) |
| 4 | Implement format priority (JSON > YAML > YML) | None | impl-2.3, test-1.2 | N/A | file.test.ts (format-discovery) |
| 5 | YAML parsing via js-yaml | None | impl-2.1, impl-2.2 | N/A | config-parser.test.ts (YAML parsing) |
| 6 | Graceful error handling & fallback | None | impl-2.3, test-1.1 | N/A | config-parser.test.ts (error-cases), file.test.ts (integration) |
| 7 | Maintain security (path validation) | None | impl-2.3, test-1.3 | N/A | file.test.ts (symlink, boundary) |
| 8 | Backward compatibility (JSON unchanged) | None | impl-2.3, test-1.2 | N/A | file.test.ts (JSON legacy path) |
| 9 | Updated README with examples | None | impl-4.x, test-n/a | N/A | Manual review |
| 10 | No breaking API changes | None | impl-2.3 | N/A | file.test.ts (signature unchanged) |

---

## Quality Criteria Summary

✓ **Decomposition Decision**: Single-ticket approach justified (straightforward feature, no parallel tracks needed)  
✓ **Reuse Evidence**: Leveraging existing `loadConfiguration()` security model; no duplicate utilities found via search  
✓ **Parameterized Tests**: Explicit data provider class + external YAML/JSON samples in `tests/test-data/config-samples/`  
✓ **Duplication**: None detected; config parser is new utility justified by new format requirements  
✓ **Dependency Graph**: No cycles; config-parser → file.ts (no reverse dependency)  
✓ **Feature Flags**: Not needed (backward-compatible); justified by opt-in nature  
✓ **Observability**: Debug logs for format detection; error logs for parse failures  
✓ **Traceability**: All ACs mapped to test + implementation tasks  
✓ **Rollback Strategy**: Dependency removal path documented in Section 9  
✓ **Security & Privacy**: Symlink checks, workspace boundary validation, safe YAML parsing all addressed
