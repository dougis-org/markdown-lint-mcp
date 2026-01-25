## Pre-Commit Quality Review

Follow this checklist before committing and pushing changes:

### 5.1 Duplication Check (Local)
1. **Intra-file duplication:** Search for repeated patterns within each changed file
2. **Cross-file duplication:** Compare similar logic across changed files
3. **Existing codebase conflicts:** Check for utilities that duplicate existing patterns
4. **Action:** If duplication found, extract to shared utility or refactor

### 5.2 Complexity Assessment (Local)
1. **Method length:** No methods >20-30 lines
2. **Cyclomatic complexity:** Keep <10 (measure via linter)
3. **Nesting depth:** Avoid >3 levels of nesting
4. **Readability:** Code should be self-documenting

### 5.3 Quality Gates

| Gate | Command | Expected Result |
|------|---------|-----------------|
| Build | `npm run build` or equivalent | No errors |
| Unit Tests | `npm test` or equivalent | All green |
| Linting | `npm run lint` or equivalent | No blocking issues |
| Coverage | Maintained or improved | No regression |

### 5.4 Pre-Commit Cleanup

- [ ] No dead code or commented blocks
- [ ] No unused imports or variables
- [ ] No TODO/FIXME without ticket references
- [ ] No console.log or debug statements (unless intentional)
- [ ] Documentation updated for public APIs
