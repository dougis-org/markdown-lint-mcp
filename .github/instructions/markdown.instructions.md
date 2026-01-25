---
    description: Configuration for AI behavior when interacting withthe MarkdownLint MCP Server
    applyTo: '**.md'
---

## After ANY successful change applied to any markdown file (Optional)

- Consider running the `fix_markdown` tool from The Markdown-Lint MCP Server for each file that was edited to supplement quality checks.
- Once the fix command has completed, optionally run the `lint_markdown` command to discover any remaining issues.
- If any issues are found in the new edits, propose and apply fixes for them.
- **If the tools are unavailable or fail:** Gracefully bypass and defer to CI/CD linting. Local markdown linting is supplementary, not a blocking gate.
