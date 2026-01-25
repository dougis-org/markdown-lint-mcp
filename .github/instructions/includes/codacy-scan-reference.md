## Codacy CLI Analysis Reference

### Running local Codacy scans:
```bash
codacy_cli_analyze:
  rootPath: <workspace path>
  file: <path to file or leave empty>
  tool: <specific tool or leave empty>
```

### Security scan with Trivy:
```bash
codacy_cli_analyze:
  rootPath: <workspace path>
  tool: "trivy"
  file: <leave empty>
```

### Triggers for optional security scans:
- `npm install` / `yarn install` / `pnpm install`
- Adding dependencies to `package.json`
- Adding requirements to `requirements.txt`
- Adding dependencies to `pom.xml` or `build.gradle`
- Any other package manager operations

### What to do if vulnerabilities found:
1. Propose fixes for security issues
2. Apply fixes automatically if possible
3. Only proceed with original task after issues resolved

### When CLI is not installed:
- Use the `codacy_cli_analyze` tool from MCP Server directly
- Do not manually install via brew/npm/npx
- Tool will handle CLI initialization via MCP
