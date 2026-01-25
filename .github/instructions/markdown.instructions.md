---
description: Configuration for AI behavior when interacting with MarkdownLint MCP Server
applyTo: '**.md'
---

# Markdown Linting Rules

## After markdown file edits

Refer to `.github/instructions/includes/local-analysis-pattern.md` for local markdown linting workflow.

### Markdown-specific workflow:
1. Run `fix_markdown` tool on edited file(s)
2. Run `lint_markdown` to discover remaining issues
3. Propose and apply fixes as needed

Refer to `.github/instructions/includes/tool-unavailability-handling.md` if tools are unavailable.

