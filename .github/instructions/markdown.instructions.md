---
    description: Configuration for AI behavior when interacting withthe MarkdownLint MCP Server
    applyTo: '**.md'
---

## CRITICAL: After ANY successful change applied to any markdown file

- YOU MUST IMMEDIATELY run the `fix_markdown` tool from The Markdown-Lint MCP Server for each file that was edited.
- Once the fix command has completed, you must then run the `lint_markdown` command to discover any remaining issues.
- If any issues are found in the new edits, propose and apply fixes for them.
- > NOTE: Failure to follow this rule is considered a critical error.
