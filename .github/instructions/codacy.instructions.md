---
    description: Configuration for AI behavior when interacting with Codacy's MCP Server
    applyTo: '**'
---
---
# Codacy Rules
Configuration for AI behavior when interacting with Codacy's MCP Server

## After ANY successful `edit_file` or `reapply` operation (Optional)
- Consider running the `codacy_cli_analyze` tool from Codacy's MCP Server for each file that was edited to supplement quality checks:
 - `rootPath`: set to the workspace path
 - `file`: set to the path of the edited file
 - `tool`: leave empty or unset
- If any issues are found in the new edits, propose and apply fixes for them.
- **If the tool is unavailable or fails:** Gracefully bypass and defer to CI/CD scans. Local scans are supplementary, not blocking gates.

## When you tried to run the `codacy_cli_analyze` tool and the Codacy CLI is not installed
- If the Codacy CLI is not installed, gracefully skip the local scan and proceed—Codacy scans will run in CI/CD
- Optionally, inform the user that they can enable automatic local scans by installing the Codacy CLI via the extension settings

## After every response
- If you made any file edits in this conversation and are able to run the `codacy_cli_analyze` tool, consider verifying the changes with local scans (optional, supplementary)
- Do not halt progress if local scans are unavailable—CI/CD will validate before merging 

## When there are no Codacy MCP Server tools available, or the MCP Server is not reachable
- Suggest the user the following troubleshooting steps:
 - Try to reset the MCP on the extension
 - If the user is using VSCode, suggest them to review their Copilot > MCP settings in Github, under their organization or personal account. Refer them to Settings > Copilot > Enable MCP servers in Copilot. Suggested URL (https://github.com/settings/copilot/features) or https://github.com/organizations/{organization-name}/settings/copilot/features (This can only be done by their organization admins / owners)
- If none of the above steps work, suggest the user to contact Codacy support

## Trying to call a tool that needs a rootPath as a parameter
- Always use the standard, non-URL-encoded file system path

## CRITICAL: Dependencies and Security Checks (Recommended)
- After ANY of these actions, consider running security validation with `codacy_cli_analyze` (optional but recommended):
 - Running npm/yarn/pnpm install
 - Adding dependencies to package.json
 - Adding requirements to requirements.txt
 - Adding dependencies to pom.xml
 - Adding dependencies to build.gradle
 - Any other package manager operations
- If running the tool, execute with:
 - `rootPath`: set to the workspace path
 - `tool`: set to "trivy"
 - `file`: leave empty or unset
- If vulnerabilities are found due to newly added packages:
 - Propose and apply fixes for the security issues
 - Only continue with the original task after issues are resolved
- **If the tool fails or is unavailable:** Proceed—CI/CD security scans will catch vulnerabilities before merging
- EXAMPLE:
 - After: npm install react-markdown
 - Consider: Run codacy_cli_analyze with trivy (optional)
 - If unavailable: Continue—Trivy will scan in CI/CD

## General
- Repeat the relevant steps for each modified file.
- "Propose fixes" means to both suggest and, if possible, automatically apply the fixes.
- Local Codacy scans are optional and supplementary to CI/CD validation—do not block progress if scans fail
- Do not run `codacy_cli_analyze` looking for changes in duplicated code or code complexity metrics.
- Complexity metrics are different from complexity issues. When trying to fix complexity in a repository or file, focus on solving the complexity issues and ignore the complexity metric.
- Do not run `codacy_cli_analyze` looking for changes in code coverage.
- Do not try to manually install Codacy CLI using either brew, npm, npx, or any other package manager.
- If the Codacy CLI is not installed, just run the `codacy_cli_analyze` tool from Codacy's MCP Server.
- When calling `codacy_cli_analyze`, only send provider, organization and repository if the project is a git repository.

## Whenever a call to a Codacy tool that uses `repository` or `organization` as a parameter returns a 404 error
- Offer to run the `codacy_setup_repository` tool to add the repository to Codacy
- If the user accepts, run the `codacy_setup_repository` tool
- Do not ever try to run the `codacy_setup_repository` tool on your own
- After setup, immediately retry the action that failed (only retry once)
---