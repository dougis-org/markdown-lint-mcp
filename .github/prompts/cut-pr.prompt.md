---
description: Cut a PR from the current branch to a user provided one
---
**Goal:** Cut a PR to the target branch implementing the work scoped in the provided GitHub issue plan file/repo changes.

> This prompt assumes there are changes pushed to remote from the current branch. If not, please push your changes first.

## Inputs
Required:
- **Target Branch:** {{BRANCH_NAME}} (user input)
Optional:
- **Added Comments:** {{ADDED_COMMENTS}} (user input)
- **GitHub Issue Number:** {{ISSUE_NUMBER}} (user input)
- **Current branch:** current workspace

## Phase 0: Confirm Inputs
0.1 Echo the target branch: {{BRANCH_NAME}} and GitHub Issue Number: {{ISSUE_NUMBER}} (if provided)
0.2 Echo any added comments: {{ADDED_COMMENTS}} (if provided)
0.3 Confirm the input with the user before proceeding, if they provide changes update the inputs accordingly.
0.4 Confirm the current branch is not {{BRANCH_NAME}}. If it is, abort with an error message.
0.5 Confirm there are changes pushed to remote from the current branch. If not, abort with an error message.
0.6 Confirm that {{BRANCH_NAME}} exists on remote. If not, abort with an error message.
0.7 Confirm that the current branch is up to date with remote. If not, abort with an error message.
0.8 Confirm that there are no merge conflicts between the current branch and {{BRANCH_NAME}}. If there are, abort with an error message.
---

## Phase 1: Read changes
0.1 `git fetch origin`  
0.2 `git diff origin/{{BRANCH_NAME}}...HEAD --stat` → summarize
0.3 `git diff origin/{{BRANCH_NAME}}...HEAD` → analyze for plan adherence

---
## Phase 2: Generate PR Content
### Title
Generate {{PR_TITLE}} based on the changes made and the GitHub Issue Number: {{ISSUE_NUMBER}} (if provided).
This must be a semantic title (remember to place the GitHub issue number right after the : if there is a GitHub issue number).

### Description
{{PR_DESCRIPTION}}
Please generate a detailed PR description based on the changes made. 
The description should use the .github/pull-request-template.md file as a template,
and must fill out all sections.
If the user has provided {{ADDED_COMMENTS}}, please include them at the end of the PR description
under a section named "Additional Comments".

## Phase 3: Confirm PR Content
echo the generated {{PR_TITLE}} and {{PR_DESCRIPTION}} to the user for confirmation.

Use this format:
```
### PR Title:
{{PR_TITLE}}

### PR Description:
{{PR_DESCRIPTION}}
```

Ask the user to confirm if they would like to proceed with cutting the PR with the above title and description. If not, abort the process.
---
## Phase 4: Cut the PR
Please cut a PR to {{BRANCH_NAME}} with a title of {{PR_TITLE}} and a description of {{PR_DESCRIPTION}. Use the create_pull_request tool from the github MCP server to create the PR and use the .github/pull-request-template.md as a template for your description, fill out all sections.

If {{ADDED_COMMENTS}} exist, please include them at the end of the PR description under a section named "Additional Comments".
---
## Phase 3: Output
2.1 Provide the PR link only for review.