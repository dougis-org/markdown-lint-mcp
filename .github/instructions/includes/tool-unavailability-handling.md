## Tool Unavailability & Fallback Strategy

### When tools are unavailable or fail:
- Gracefully bypass and defer to CI/CD validation
- Local analysis is supplementary, not a blocking gate
- Do not halt progress if scans fail—CI/CD will validate before merging

### Error troubleshooting (if applicable):
1. Try to reset the MCP on the extension
2. For VSCode: Review Copilot > MCP settings at:
   - Personal: https://github.com/settings/copilot/features
   - Organization: https://github.com/organizations/{org-name}/settings/copilot/features
3. Contact tool support if steps don't work

### Tool-specific handling:
| Condition | Action |
|-----------|--------|
| 404 error on repository parameter | Run setup tool to register repository |
| CLI not installed | Run tool via MCP Server (no manual installation) |
| Generic failure | Proceed—CI/CD will catch issues before merging |
