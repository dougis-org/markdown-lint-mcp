---
description: Configuration for AI behavior when interacting with Codacy's MCP Server
applyTo: '**'
---

# Codacy Rules

Configuration for AI behavior when interacting with Codacy's MCP Server.

## Local Analysis (Optional)

Refer to `.github/instructions/includes/local-analysis-pattern.md` for when and how to run local analysis.

## Codacy Scan Reference

Refer to `.github/instructions/includes/codacy-scan-reference.md` for:
- How to run `codacy_cli_analyze` tool
- Security scan parameters for dependency checking
- Trivy vulnerability scanning

## Tool Unavailability & Errors

Refer to `.github/instructions/includes/tool-unavailability-handling.md` for:
- Graceful fallback strategies
- Troubleshooting steps when tools unavailable
- 404 error handling for repository/organization parameters

## Key Principles

- Repeat analysis steps for each modified file
- "Propose fixes" means suggest AND automatically apply when possible
- Local scans are supplementary; CI/CD is authoritative
- Do NOT run Codacy looking for metrics (duplication, complexity, coverage)
- Focus on fixing issues, not optimizing metrics
- Always use standard file system paths (non-URL-encoded)
- When calling tools with git parameters, only send if it's a git repository

## 404 Error on Repository Parameter

- Offer to run `codacy_setup_repository` tool to register repository
- Only run if user accepts (never run automatically)
- After setup, retry the failed action (max one retry)
