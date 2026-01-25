# MCP Tooling Requirements (Shared)

This include defines the mandatory use of Model Context Protocol (MCP) tools for all file operations, code search, and repository interactions. **Use MCP tooling ALWAYS—shell command workarounds are forbidden.**

## Core Principle

All agent and prompt execution must prioritize MCP-provided tools over shell commands. MCP tools provide superior context, error handling, and integration with GitHub/Jira platforms.

---

## File Operations

### FORBIDDEN: Shell Commands for File Operations
- ❌ `sed`, `awk`, `perl` for file edits
- ❌ `cat`, `less`, `more` for file reading
- ❌ `echo` redirects (`>`, `>>`) for file writes
- ❌ `cp`, `mv`, `rm` for file/directory operations
- ❌ `mkdir -p` for directory creation

### REQUIRED: Use MCP File Tools

#### 1. **Reading Files**
**MCP Tool:** `desktop-commander/read_file` or `github/get_file_contents`

**Examples:**
- ✅ Read `.github/pull_request_template.md` for PR template structure
- ✅ Read plan file `docs/plan/tickets/{{TICKET_ID}}-plan.md`
- ✅ Read code file for analysis (with offset/length for large files)

**When to use each:**
- `desktop-commander/read_file`: Local file access, supports pagination (offset/length), image rendering
- `github/get_file_contents`: Remote GitHub files, canonical source of truth

#### 2. **Writing / Updating Files**
**MCP Tool:** `desktop-commander/edit_block` or `github/create_or_update_file`

**Examples:**
- ✅ Create new plan file: `desktop-commander/edit_block` with content
- ✅ Update existing prompt: `github/create_or_update_file` with commit message
- ✅ Append to file: `desktop-commander/edit_block` with targeted insertion

**When to use each:**
- `desktop-commander/edit_block`: Local file edits with find/replace semantics, supports expected_replacements for multiple matches
- `github/create_or_update_file`: Remote GitHub commits with message, handles SHA tracking for updates

#### 3. **Creating Directories**
**MCP Tool:** `desktop-commander/create_directory`

**Example:**
- ✅ Create directory tree: `docs/plan/tickets/{{TICKET_ID}}/`

#### 4. **Listing Files/Directories**
**MCP Tool:** `desktop-commander/list_directory`

**Example:**
- ✅ List `.github/PULL_REQUEST_TEMPLATE/` or `.github/` to find PR template
- ✅ Recursive listing with depth parameter for deep exploration

#### 5. **Moving/Renaming Files**
**MCP Tool:** Desktop Commander `move_file` or git operations via `run_in_terminal`

**Note:** For complex directory reorganization, use git commands in terminal, but for simple file moves prefer MCP.

---

## File Search & Code Discovery

### FORBIDDEN: Shell Search Workarounds
- ❌ `grep`, `grep -r` for code search (use MCP instead)
- ❌ `find -name`, `find -path` for file discovery
- ❌ `ls -la`, `ls -R` for directory exploration
- ❌ Text extraction via `awk`, `cut`, `tr` without MCP context

### REQUIRED: Use MCP Search Tools

#### 1. **File Discovery by Name/Pattern**
**MCP Tool:** `desktop-commander/start_search` with `searchType="files"`

**Examples:**
- ✅ Find PR template: `pattern="pull_request_template"`, `searchType="files"`
- ✅ Find all test files: `pattern="*.test.ts"`, `searchType="files"`
- ✅ Find agent/prompt files: `pattern="*.agent.md"`, `searchType="files"`, `path="/home/.../agents"`

**Key Parameters:**
- `searchType="files"`: Search by filename/pattern
- `filePattern`: Optional additional filter (e.g., `*.md`)
- `literalSearch`: Use `true` for exact string matching (recommended for filenames with special chars)
- `ignoreCase`: Usually `true` for file search
- `earlyTermination`: `true` to stop on exact match

#### 2. **Code/Content Search**
**MCP Tool:** `desktop-commander/start_search` with `searchType="content"`

**Examples:**
- ✅ Find all git commands in prompts: `pattern="git status"`, `searchType="content"`, `filePattern="*.md"`
- ✅ Find utility classes: `pattern="class.*Validator"`, `searchType="content"` (regex-based)
- ✅ Find TODO/FIXME comments: `pattern="TODO"`, `searchType="content"`, `literalSearch=true`

**Key Parameters:**
- `searchType="content"`: Search inside file contents
- `pattern`: Regex by default; use `literalSearch=true` for exact strings
- `contextLines`: Number of surrounding lines to return (default 5)
- `literalSearch`: Set `true` for patterns with regex metacharacters or for exact matching

#### 3. **Smart Repository Search (Semantic/Advanced)**
**MCP Tool:** `deepcontext/search_codebase` (if codebase is indexed)

**Prerequisites:**
- Run `mcp_deepcontext_index_codebase` first to prepare codebase
- Best for architectural/semantic searches

**Examples:**
- ✅ Find authentication logic: `query="user authentication middleware"`
- ✅ Find database access patterns: `query="database connection pool"`

**Note:** Deepcontext is excellent for high-level code discovery; use file/content search for targeted text matches.

---

## Git & Version Control Operations

### FORBIDDEN: Raw Git Commands Without MCP
- ❌ `git add` / `git commit` / `git push` as shell invocations (use MCP + GitHub API)
- ❌ `git log`, `git show`, `git diff` for heavy lifting (use MCP branch/commit tools)
- ❌ `git fetch` for automated remote tracking (MCP tools handle this)

### REQUIRED: Use MCP Git & GitHub Tools

#### 1. **Git Status & Change Detection**
**MCP Tool:** `run_in_terminal` (minimal use) → prefer GitHub API status checks

**Better Alternative:** Use `desktop-commander/start_search` to find changed files and `read_file` to compare.

#### 2. **Branch Management**
**MCP Tool:** `github/create_branch` (create new branch)

**Examples:**
- ✅ Create feature branch: `github/create_branch` with semantic naming
- ✅ List branches: `github/list_branches` to verify branch exists

#### 3. **Commit & Push**
**Workflow:**
1. Use `desktop-commander/edit_block` to create/update files
2. Use `github/push_files` to commit and push in one step (preferred)
3. Alternative: Use `run_in_terminal` with `git add`, `git commit -S`, `git push` only if multiple independent changes required

**Examples:**
- ✅ Create plan file + push: `github/push_files` with single commit message
- ✅ Multi-file update: `github/push_files` to atomically commit all changes

#### 4. **Viewing Commits & Diffs**
**MCP Tools:** `github/get_commit`, `github/list_commits`

**Examples:**
- ✅ Get commit details: `github/get_commit` with SHA
- ✅ List recent commits: `github/list_commits` for branch history

#### 5. **PR Creation**
**MCP Tool:** `github/create_pull_request` (now in MCP; replaces manual PR creation)

**Workflow:**
1. Verify all changes are pushed (use GitHub API status)
2. Call `github/create_pull_request` with title, description, base branch
3. Capture PR URL and present to user

**Examples:**
- ✅ Create PR to default branch: `github/create_pull_request` with semantic title and description

---

## GitHub Issue & Project Management

### REQUIRED: Use MCP GitHub Tools

#### 1. **Reading Issues/Tickets**
**MCP Tools:**
- `gh-issues/issue_read`: Fetch issue details (title, description, state, labels, etc.)
- `gh-issues/search_issues`: Search for specific issues by query

**Examples:**
- ✅ Fetch ticket by number: `gh-issues/issue_read` with issue number
- ✅ Find related issues: `gh-issues/search_issues` with relevant query

#### 2. **Creating/Updating Issues**
**MCP Tool:** `gh-issues/issue_write` with `method="create"` or `method="update"`

**Examples:**
- ✅ Create tracking issue: `gh-issues/issue_write(method="create", ...)`
- ✅ Close issue with reason: `gh-issues/issue_write(method="update", state="closed", state_reason="completed")`

#### 3. **Adding Comments**
**MCP Tool:** `gh-issues/add_issue_comment`

**Examples:**
- ✅ Add PR link to issue: `gh-issues/add_issue_comment` with PR URL
- ✅ Add progress update: `gh-issues/add_issue_comment` with status summary

---

## Repository Metadata & Context

### REQUIRED: Use GitHub API Tools (MCP)

#### 1. **Repository Details**
**MCP Tool:** GitHub API via mcp_github tools (context available automatically)

**Info to extract:**
- Default branch (for PR targets)
- Owner and repository name
- Branch protection rules
- Repository topics/descriptions

#### 2. **Directory/File Existence Checks**
**MCP Tool:** `desktop-commander/list_directory` → inspect for presence of files

**Examples:**
- ✅ Check PR template exists: `list_directory` on `.github/` and look for `pull_request_template.md`
- ✅ Verify agent/prompt structure: `list_directory` on `.github/agents/` and `.github/prompts/`

---

## Diff & Change Analysis

### FORBIDDEN: Shell Diff Commands
- ❌ `git diff`, `diff -u`, `diff -r` for comparing files

### REQUIRED: Use MCP Diff Tools

#### 1. **Analyze Changes in Current Branch**
**MCP Tool:** `run_in_terminal` with `git diff origin/main...HEAD` (minimal) → **prefer GitHub API**

**Better Approach:**
1. Use `github/list_commits` to get commit SHAs on current branch
2. Use `github/get_commit` to fetch commit details including changed files
3. Use `desktop-commander/read_file` to read original + changed versions side-by-side

#### 2. **Compare File Versions**
**MCP Tool:** `desktop-commander/read_file` on both versions + manual comparison

---

## Testing & Code Quality

### For Running Tests

**MCP Tool:** `run_in_terminal` for test execution (intended for this)

**Examples:**
- ✅ Run test suite: `run_in_terminal(command="npm test", ...)`
- ✅ Run linter: `run_in_terminal(command="eslint src/", ...)`
- ✅ Run Codacy analysis: `codacy_cli_analyze` tool (Codacy MCP)

### For Code Coverage & Duplication
**MCP Tools:** Codacy MCP server tools
- `codacy_cli_analyze`: Run local analysis
- `codacy_list_repository_issues`: Fetch code quality metrics
- `codacy_get_file_clones`: Detect duplicated code

---

## Data Processing & Analysis

### For CSV/JSON/Data Files

**NEVER use:** Shell tools like `awk`, `cut`, `jq` alone without MCP context.

**REQUIRED MCP Approach:**
1. Use `desktop-commander/read_file` to load file content
2. Start interactive REPL: `desktop-commander/interact_with_process` with Python or Node.js
3. Parse and analyze data inside the REPL session

**Examples:**
- ✅ Parse JSON: Load via `read_file`, process in Python via `interact_with_process`
- ✅ Analyze CSV: `read_file` → interactive Python `pandas` session
- ✅ Extract statistics: Use REPL for calculations, not shell commands

---

## Terminal Operations (Minimal Use)

### When to Use `run_in_terminal`

`run_in_terminal` should be used **sparingly** for:
- Complex git workflows that require sequences of commands
- Running build/test/quality tools that don't have MCP equivalents
- Native CLI tools that have no MCP alternative
- Execution of scripts written by the user

### When NOT to Use `run_in_terminal`

- ❌ File reads/writes (use MCP file tools)
- ❌ File searches (use MCP search tools)
- ❌ GitHub API calls (use MCP GitHub tools)
- ❌ Simple text processing (use MCP + REPL if needed)

### Best Practices for Terminal Use

1. **Explicit output handling:** Capture and validate output; don't assume success
2. **Error checking:** Verify exit codes and error messages
3. **Timeout considerations:** Use `isBackground=false` for synchronous operations
4. **Complexity limits:** If command becomes multi-line or conditional, consider MCP alternative

---

## Summary Decision Tree

```
Need to...                          → Use MCP Tool
─────────────────────────────────────────────────────────────
Read a file                         → desktop-commander/read_file
Write/edit a file                   → desktop-commander/edit_block
List directory                      → desktop-commander/list_directory
Find file by name                   → desktop-commander/start_search (searchType="files")
Search code/content                 → desktop-commander/start_search (searchType="content")
Create branch                       → github/create_branch
Create/update issue                 → gh-issues/issue_write
Add issue comment                   → gh-issues/add_issue_comment
Fetch commit details                → github/get_commit
List commits                        → github/list_commits
Create PR                           → github/create_pull_request
Push files + commit                 → github/push_files
Run tests                           → run_in_terminal (test runner command)
Run linter                          → run_in_terminal (linter command)
Analyze code quality                → codacy_cli_analyze
Semantic code search                → deepcontext/search_codebase (if indexed)
```

---

## Enforcement

- **All agents and prompts MUST reference this include** when delegating file/search operations
- **No workarounds:** If an MCP tool exists for the task, it is **mandatory** to use it
- **Explain deviations:** If `run_in_terminal` is used for non-trivial operations, document why MCP alternative was insufficient
- **Code review check:** Flag any sed/awk/grep/cat usage in prompts/agents as non-compliant
