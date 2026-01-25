## Local Analysis Pattern

### When to run local analysis:
- After any successful file edit or code change
- Optional and supplementary (not required)
- Provides fast feedback loop; CI/CD remains authoritative

### Local analysis workflow:
1. Run analysis tool for changed file(s)
2. If issues found: propose and apply fixes
3. Continue with task if tool unavailable

### Important limits:
- ❌ Do NOT run analysis looking for duplication metrics
- ❌ Do NOT run analysis looking for complexity metrics
- ❌ Do NOT run analysis looking for code coverage metrics
- ✅ DO focus on fixing issues, not metrics

### Why local analysis is optional:
- CI/CD scans are authoritative and run on all PRs
- Local scans supplement but don't replace CI/CD
- CLI installation is not required; use MCP Server instead
