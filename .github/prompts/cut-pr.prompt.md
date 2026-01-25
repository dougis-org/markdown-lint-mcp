---
description: Cut a PR from the current branch to the default branch with automatic PR creation
---

**Tool Requirements:**
Refer to `.github/prompts/includes/mcp-tooling-requirements.md` for mandatory MCP tool usage.

**Goal:** Verify all changes are committed and pushed to the current branch, then automatically cut a PR to the repository's default branch with a semantic title and complete description using the repository's PR template (or best practices if no template exists).

## Inputs
Optional:
- **Added Comments:** {{ADDED_COMMENTS}} (user input for additional PR notes)
- **Ticket Identifier:** {{TICKET_ID}} (GitHub issue number or Jira ticket key, optional; auto-detected from branch name if not provided)
- **Current branch:** current workspace

## Phase 0: Pre-flight Checks

### 0.1 Validate Current Branch State
Execute the following checks in order. **If any check fails, abort immediately with a clear error message.**

**0.1.1 Check for uncommitted changes:**
```
git status --porcelain
```
- If output is non-empty (uncommitted changes exist): **FATAL ERROR** - User must commit changes first. Provide guidance: `git add . && git commit -m "<message>"`

**0.1.2 Check for unpushed commits:**
```
git log origin/$(git rev-parse --abbrev-ref HEAD)..HEAD --oneline
```
- If output is non-empty (commits not yet pushed): **FATAL ERROR** - User must push changes or authorize agent to push
  - Offer: "Changes detected that have not been pushed to remote. I can push them for you with your approval. Proceed? (yes/no)"
  - If user approves: `git push -u origin $(git rev-parse --abbrev-ref HEAD)` → wait for success
  - If user declines: abort and provide guidance: `git push -u origin <branch-name>`
  - If push fails: report error and abort

**0.1.3 Verify branch is up to date with remote:**
```
git fetch origin
git rev-parse HEAD
git rev-parse origin/$(git rev-parse --abbrev-ref HEAD)
```
- If the two SHAs do not match: **FATAL ERROR** - Current branch is behind remote. User must pull: `git pull origin $(git rev-parse --abbrev-ref HEAD)`

**0.1.4 Get repository metadata:**
- Determine CURRENT_BRANCH = `git rev-parse --abbrev-ref HEAD`
- Determine DEFAULT_BRANCH = repository default branch (via GitHub API)
- Verify CURRENT_BRANCH ≠ DEFAULT_BRANCH. If equal: **FATAL ERROR** - "Cannot cut PR from default branch to itself."

**0.1.5 Verify no merge conflicts (dry-run):**
```
git merge --no-commit --no-ff origin/{{DEFAULT_BRANCH}} (on current branch)
```
Then:
```
git merge --abort
```
- If merge conflicts detected: **FATAL ERROR** - User must resolve conflicts manually. Provide guidance on resolving and pushing.

**All checks passed?** → Proceed to Phase 1. Otherwise, halt and await user intervention.

---

## Phase 1: Gather Repository Context

**1.1 Fetch PR template (if exists):**
- Check for `.github/pull_request_template.md` or `.github/PULL_REQUEST_TEMPLATE.md`
- If found: load as PR_TEMPLATE
- If not found: PR_TEMPLATE = null (will use best practices structure in Phase 2)

**1.2 Auto-detect Ticket Identifier (if not provided):**
- Parse CURRENT_BRANCH for pattern: `<prefix>/<ISSUE_NUMBER>-<summary>` or `<prefix>/<TICKET_KEY>-<summary>`
- If pattern matches: extract and use as TICKET_ID
- Otherwise: TICKET_ID remains unset (PR will proceed without ticket reference)

**1.3 Analyze changes:**
```
git diff origin/{{DEFAULT_BRANCH}}...HEAD --stat
```
→ Store as CHANGES_SUMMARY (file-level overview)

```
git diff origin/{{DEFAULT_BRANCH}}...HEAD
```
→ Store as CHANGES_FULL (detailed diff for context)

---

## Phase 2: Generate PR Content

### 2.1 Generate PR Title (Semantic Commit Style)
**Format:** `<type>(<scope>): #<TICKET_ID> <brief description>` (if TICKET_ID available) or `<type>(<scope>): <brief description>` (if not)

**Determine type:**
- `feat`: new feature or capability
- `fix`: bug fix
- `docs`: documentation only
- `refactor`: code restructuring (no behavior change)
- `test`: test additions/updates
- `chore`: build, CI/CD, config, or non-runtime changes
- Default to most common type in commit history for the branch

**Determine scope:** smallest logical component from changed files (e.g., `api`, `schema`, `prompt`, `auth`)

**Generate brief summary:** Concise, imperative mood, ≤ 60 characters after `#TICKET_ID` (if present)

**Examples:**
- `feat(api): #214 add payload eviction endpoint`
- `fix(cache): prevent stale hit after TTL expiry`
- `docs(prompt): update work-ticket instructions`

### 2.2 Generate PR Description

If PR_TEMPLATE exists: use it as base structure, filling in all sections.

If PR_TEMPLATE does not exist: use this best-practices structure:

```
## Description
<Detailed explanation of changes made. Reference ticket/issue if available.>

## Type of Change
- [ ] Bug fix (non-breaking fix addressing an issue)
- [ ] New feature (non-breaking addition)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Changes Made
<Summary of files changed and what each does. Reference CHANGES_SUMMARY.>

## Testing
<Explanation of how changes were tested, including test results and coverage.>

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass locally (unit + integration)
- [ ] Linting passes (Spotless, ESLint, Markdownlint, etc. as applicable)
- [ ] No merge conflicts with default branch
- [ ] Documentation updated (if applicable)

## Risk & Rollout
<Key risks and mitigation strategies. Reference rollout plan from ticket if available.>

## Related Issues
<Link to GitHub issue or Jira ticket (e.g., Closes #214, Related to TICKET-456).>
```

Then:
1. Fill in Description with context from changes and commit messages
2. Analyze changed files to select relevant checkboxes
3. Include test summary from CHANGES_SUMMARY
4. If TICKET_ID exists: add "Closes #TICKET_ID" or appropriate link
5. If {{ADDED_COMMENTS}} provided: append them in an "Additional Comments" section

---

## Phase 3: Create the PR

**3.1 Auto-create PR (no user confirmation required):**
- Use GitHub API to create PR from CURRENT_BRANCH → DEFAULT_BRANCH
- Title: {{PR_TITLE}} (from Phase 2.1)
- Description: {{PR_DESCRIPTION}} (from Phase 2.2)
- Draft mode: false (create as ready-for-review)

**3.2 Handle creation result:**
- If successful: capture PR_URL and PR_NUMBER
- If failed (e.g., branch protection rules, required status checks): report error and provide remediation guidance

---

## Phase 4: Output

**4.1 Present PR Details to User:**

```
✅ PR Successfully Created!

### PR Title:
{{PR_TITLE}}

### PR Number:
#{{PR_NUMBER}}

### PR URL:
{{PR_URL}}

### Target Branch:
{{DEFAULT_BRANCH}}

### Changes Summary:
{{CHANGES_SUMMARY}}

### Description Preview:
{{PR_DESCRIPTION}}
```

**4.2 Next Steps (informational only):**
- PR is ready for review by CODEOWNERS and domain reviewers
- If applicable: request reviewers to merge when approved
- If ticket exists: update ticket with PR link in comments
