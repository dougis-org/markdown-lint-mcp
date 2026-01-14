---
description: Determine the single next GitHub issue that can safely be started (critical-path first). Returns ONLY the issue number or, if none are startable, an explanation of blockers.
---

# find-next-ticket Prompt

## ⚠️ MODE ENFORCEMENT

**This prompt requires the `find-next-ticket` chatmode to be active.**

If you selected a different chatmode (e.g., `plan-ticket`, `work-ticket`, or `analyze-ticket`), please:
1. Switch to `.github/chatmodes/find-next-ticket.chatmode.md`
2. Return to this prompt

The chatmode provides execution guardrails; this prompt provides specific implementation workflow.

---

Goal: Identify exactly one GitHub issue (number only) that is the next logical item to pick up, prioritizing the critical path, with zero side effects (read-only). If no item is startable, output a concise blocker explanation instead of a number.

## User Preference Check (First Step)
Before fetching issues, ask the user: "Do you want to see only issues assigned to you, or all unblocked issues?"
- If "assigned to me" or similar: filter for issues assigned to you
- If "all issues" or similar: proceed with unfiltered query
- If unclear or no response: default to all issues

## Output Contract (STRICT)
- If a startable issue exists: OUTPUT ONLY the issue number (e.g., `#19`) and NOTHING else (no backticks, no prose).
- If none are startable: output a short human explanation listing the earliest blocked issue and its blocking predecessors (numbers + statuses). Do NOT fabricate numbers.
- Never modify GitHub issues, add comments, or transition statuses.


## Read-Only Data Acquisition
Use GitHub issue search and API queries ONLY. Never assume statuses—always fetch.

Fetch candidates (adjust based on user preference from step above):
GitHub Filter 1 (open issues - all tickets):
  state:open is:issue

GitHub Filter 2 (open issues - assigned to current user):
  state:open is:issue assignee:@me

Fetch individual issues (fields): number, state, type, title, linkedIssues, labels, assignee.

## Dependency Derivation
Treat GitHub issue links of type "blocks" as authoritative:
- If A "blocks" B, then B requires A to be closed before starting.
- No implicit dependencies are assumed; only explicit link relationships matter.

## Status Rules
A predecessor is considered satisfied ONLY if state == closed. (Do NOT treat draft or other open states as done.) Conservative rule prevents premature parallel starts.

Eligible (startable) candidate criteria:
- Issue status exactly "open"
- All explicit blocking predecessors satisfied (state = closed)
- All issue types considered eligible

## Selection Algorithm
1. Fetch all open candidates using the GitHub filter above.
2. For each candidate:
   a. Collect predecessor set from explicit inbound links of type "blocked by" (other end of blocks relationship).
   b. Fetch each predecessor's state.
   c. If ANY predecessor missing or not closed → this issue is blocked → record (issue, blocking set) for potential explanation.
   d. Else if issue state = open → mark as ready candidate.
3. From ready candidates, select based on priority:
   a. Sort by milestone (if present in GitHub milestone field; otherwise no milestone priority)
   b. Within same milestone, prefer higher priority labels (if present)
   c. If still tied, choose earliest by issue number.
   d. Return the first (highest priority) ready candidate number and STOP.
4. If no ready candidate exists, construct explanation:
   - Choose the earliest blocked issue by same priority rules (milestone → labels → number).
   - List its blocking predecessors (numbers + their states).
   - Output concise sentence (no markdown formatting).

## Tie-Breakers
If multiple ready items exist:
1. Prefer lower milestone number (if milestones present)
2. Within same milestone, prefer higher priority labels (if labels present)
3. If still tied, choose lowest issue number (e.g., #5 before #10)

## Validation & Safety
- Never transition or comment.
- Do not guess statuses; if a needed issue fetch fails, treat that predecessor as blocking and provide explanation.
- If GitHub API unavailable: output explanation: "No selection; GitHub unavailable (reason)." (No number.)

## Examples
Scenario A: #5 closed; #6 open (no blockers) → Return `#6`.
Scenario B: #5 in draft; #6 open (blocked by #5) → Blocked (explain #6 blocked by #5 in draft).
Scenario C: #10 open with all its explicit predecessors satisfied → Return `#10`.
Scenario D: All tasks either closed or blocked; explain earliest blocked task and its blockers.

## Execution Steps (Implementation Guidance)
1. Ask user about assignee preference (see "User Preference Check" section above).
2. Bulk search to fetch open GitHub issues using appropriate filter (number → issue object with fields: state, linkedIssues, labels, assignee).
3. Build dependency map from issue links (explicit "blocks" relationships only).
4. Identify ready candidates (no unsatisfied blockers, state = open).
5. Sort ready candidates by milestone → labels → number.
6. Return first ready candidate number, or construct blocker explanation if none ready.
7. Emit output per contract.

## Final Output Enforcement
Before emitting: validate output string.
- If regex ^#\d+$ matches → OK.
- Else explanation path is assumed.

Return ONLY the final output string.
