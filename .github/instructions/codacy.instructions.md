---
    description: Configuration for AI behavior when interacting with Codacy's MCP Server
    applyTo: '**'
---
---
# Codacy Rules
Configuration for AI behavior when interacting with Codacy's MCP Server

## using any tool that accepts the arguments: `provider`, `organization`, or `repository`
- ALWAYS use:
 - provider: gh
 - organization: ernestgwilsonii
 - repository: markdownlint-mcp
- Avoid calling `git remote -v` unless really necessary

## Guidance: Prefer CI/Codacy central scans; local Codacy scans optional
- Preferred: Allow CI or central Codacy to scan pull requests and use those results as the authoritative source of truth.
- If CI/Codacy central results are unavailable and you need to reproduce or triage an issue locally, you may run the `codacy_cli_analyze` tool from Codacy's MCP Server for affected files. When running locally:
 - `rootPath`: set to the workspace path
 - `file`: set to the path of the edited file (optional)
 - `tool`: leave empty or unset
- If local analysis finds issues, confirm the findings against CI/Codacy central data before prioritizing fixes.
- > NOTE: Local scans are intended for debugging and verification; they are optional when CI/Codacy central scans will run.

## If the Codacy CLI is not installed
- Preferred: Rely on CI/Codacy central scans rather than installing a local CLI. If CI results are available, report that and avoid local installation.
- If the user explicitly requests a local analysis (for repro/triage), ask for consent before installing the CLI:
 - If the user agrees, run the `codacy_cli_install` tool and proceed with the requested local analysis.
 - If the user declines, explain that CI/Codacy central scans will be used instead and provide guidance for disabling local automatic analysis in the extension settings.
- Wait for the user's confirmation before performing any local installation or analysis.

## After every response
- If you made any file edits in this conversation, check whether CI/Codacy central scans will run automatically; if so, rely on those results. Only offer to run `codacy_cli_analyze` locally when CI results are not available or the user requests a local run.

## When there are no Codacy MCP Server tools available, or the MCP Server is not reachable
- Defer to the Codacy run in CI

## Trying to call a tool that needs a rootPath as a parameter
- Always use the standard, non-URL-encoded file system path

## Dependencies and Security Checks (CI-preferred)
- After changing dependencies (for example, running npm/yarn/pnpm install or editing package manifests), ensure a security scan is performed. Prefer running Trivy or an equivalent scanner in CI as the authoritative security scan.
- If CI Trivy results are not yet available and an immediate local check is required, you may run `codacy_cli_analyze` locally with:
 - `rootPath`: set to the workspace path
 - `tool`: set to "trivy"
 - `file`: leave empty or unset
- If vulnerabilities are found locally, stop and propose fixes, but coordinate with CI/Codacy central results before blocking further work.
- EXAMPLE:
 - After: npm install react-markdown
 - Preferred: Wait for CI Trivy scan results; if unavailable and immediate analysis is required, run local Trivy via `codacy_cli_analyze`.

## General
- Repeat the relevant steps for each modified file.
- "Propose fixes" means to both suggest and, if possible, automatically apply the fixes.
- Do not run local scans automatically or without the user's consent; offer to run local analysis when needed and prefer CI/Codacy central scans.
- Do not run `codacy_cli_analyze` looking for changes in duplicated code or code complexity metrics.
- Complexity metrics are different from complexity issues. When trying to fix complexity in a repository or file, focus on solving the complexity issues and ignore the complexity metric.
- Do not run `codacy_cli_analyze` looking for changes in code coverage.
- Do not try to manually install Codacy CLI using either brew, npm, npx, or any other package manager.
- If the Codacy CLI is not installed and a local run is requested, ask for consent to install the CLI and run it; otherwise rely on CI/Codacy central scans.

    Preferred workflow for local vs CI Codacy runs (CI-first):
  - Preferred: Rely on CI (GitHub Actions) first; run `codacy_cli_analyze` locally only if CI/Codacy central results are unavailable and local reproduction is required.rver immediately after edits. If the local run succeeds, propose and apply any fixes as usual.
  - If the local run fails due to environment or binary-path issues (for example in WSL or other OS-specific contexts), or if the MCP Server is unreachable, do NOT attempt manual local installs. Instead:
    - Add a brief note on the Pull Request indicating that local Codacy analysis failed and that Codacy checks should run in CI (GitHub Actions).
    - If the PR is from a fork and GitHub Actions are blocked ("action_required"), request a maintainer to approve the workflow run so Codacy can execute in CI.
  - When local analysis is unavailable, prefer CI-based Codacy results as authoritative and address issues reported there.

## Whenever a call to a Codacy tool that uses `repository` or `organization` as a parameter returns a 404 error
- Offer to run the `codacy_setup_repository` tool to add the repository to Codacy
- If the user accepts, run the `codacy_setup_repository` tool
- Do not ever try to run the `codacy_setup_repository` tool on your own
- After setup, immediately retry the action that failed (only retry once)
---