# Ticket Detection & Platform Resolution

This shared guidance applies to all prompts that accept a ticket identifier. Use this logic to handle both Jira and GitHub issue tracking systems transparently.

## Auto-Detection Logic

### Step 1: Parse Input
- Extract the ticket identifier from user input or command arguments
- Trim whitespace and normalize case

### Step 2: Determine Platform by Format
Apply these rules in order:

1. **Numeric format** (e.g., `123`, `4567`)
   - Assume GitHub issue
   - Proceed to GitHub detection

2. **Alphanumeric format** (e.g., `PROJ-123`, `TEAM-456`)
   - Contains letters and numbers, typically uppercase project prefix
   - Assume Jira ticket
   - Proceed to Jira detection

3. **Ambiguous or invalid format**
   - Cannot be parsed as either platform identifier
   - Ask user: "Is this a GitHub issue number or Jira ticket key?"
   - User selects platform; proceed accordingly

### Step 3: Attempt Platform Detection

#### GitHub (numeric input)
- Use GitHub API to fetch issue (numeric ID)
- If successful: Extract title, description, acceptance criteria, labels, etc.
- If failed (404, 403, or not found):
  - **Attempt Jira fallback:** Try interpreting as Jira ticket key
    - If Jira success: continue with Jira context
    - If Jira also fails: Ask user "I couldn't find issue #{{ID}} on GitHub. Is this a Jira ticket key instead, or did you mean a different issue number?"
    - User provides clarification or corrected ID; restart detection

#### Jira (alphanumeric input)
- Use Jira API to fetch ticket (key format)
- If successful: Extract summary, description, acceptance criteria, labels, etc.
- If failed (404, 403, or not found):
  - **Attempt GitHub fallback:** Try interpreting as GitHub issue number
    - If GitHub success: continue with GitHub context
    - If GitHub also fails: Ask user "I couldn't find Jira ticket {{KEY}}. Is this a GitHub issue number instead, or did you mean a different ticket?"
    - User provides clarification or corrected ID; restart detection

### Step 4: Establish Platform Context
Once a ticket is successfully loaded, set:
- `PLATFORM` = "github" | "jira"
- `TICKET_ID` = normalized identifier for the platform
- `TICKET_URL` = full URL to ticket
- Extract and cache: title, description, AC/requirements, components, labels, assignee, status

## Implementation Notes

- **No shell scripts:** Platform detection is performed using MCP APIs (GitHub MCP and Jira MCP)
- **Graceful degradation:** If both platforms fail, ask user which to use and request corrected ID
- **Single source of truth:** This logic is defined once and referenced by all prompts
- **Caching:** Once platform is determined, reuse the platform context across phases to avoid repeated API calls
- **Transparency:** Always inform user which platform was detected and which ticket was loaded

## Common Patterns Across Prompts

Each prompt that uses ticket detection should:
1. Reference this guidance section
2. Apply steps 1–4 in the "Ticket Detection" phase (typically Phase 0 or initial step)
3. Use the established `PLATFORM` and `TICKET_ID` context for subsequent API calls
4. Include platform-specific steps only after platform is confirmed

### Example Usage in a Prompt

```
## Phase 0: Ticket Detection & Load

### Step 0.1: Identify Ticket
- Refer to `.github/prompts/includes/ticket-detection.md` for auto-detection logic
- Apply detection steps 1–4
- On success: set PLATFORM and TICKET_ID context
- On failure: abort with user guidance

### Step 0.2: Fetch Ticket Context
- If PLATFORM == "github": Use GitHub API to fetch full issue details
- If PLATFORM == "jira": Use Jira API to fetch full ticket details
- Extract and cache: title, description, AC, labels, priority, status, assignee
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Both GitHub and Jira fail | Ask user: "Which platform?" + "What's the correct identifier?" |
| API unavailable (GitHub) | Fall back to Jira; if both unavail, ask user for fallback mechanism |
| API unavailable (Jira) | Fall back to GitHub; if both unavail, ask user for fallback mechanism |
| User provides invalid format | Ask for clarification with examples: "Enter a GitHub issue number (e.g., 123) or Jira key (e.g., PROJ-456)" |
| Rate limited | Inform user, suggest retry after delay, continue with cached data if available |

## Platform-Specific Artifact Paths

Once platform is determined, use these conventions:

### GitHub
- Issue number: numeric (e.g., `123`)
- Plan file: `docs/plan/tickets/{{ISSUE_NUMBER}}-plan.md`
- Branch prefix: `feature`, `fix`, `docs`, etc. (derived from label or user input)
- Branch name: `<prefix>/{{ISSUE_NUMBER}}-short-kebab-summary`

### Jira
- Ticket key: alphanumeric (e.g., `PROJ-123`)
- Plan file: `docs/plan/tickets/{{TICKET_KEY}}-plan.md`
- Branch prefix: derived from ticket type (Story, Bug, Task, Epic)
- Branch name: `<prefix>/{{TICKET_KEY}}-short-kebab-summary`
