---
mode: code-review
description: 'Review local changes against a GitHub issue before pushing to remote.'
---

# Review Ticket Work

Review the current local changes against the requirements and acceptance criteria from a GitHub issue before pushing to remote.

## Required Input

**GitHub Issue:** {{issueNumber}}

> ⚠️ This prompt requires a valid GitHub issue number. The issue will be used to validate that all acceptance criteria are met and the implementation aligns with requirements.

---

## Review Workflow

### Step 1: Gather Context

1. **Fetch GitHub issue details** using GitHub API for the provided issue number
2. **Extract and document:**
   - Summary and description
   - Acceptance Criteria (AC)
   - Any linked requirements or specifications
   - Business context and stakeholder expectations
3. **Identify local changes** by examining unstaged/staged git changes in the repository

---

### Step 2: Acceptance Criteria Validation

For each acceptance criterion from the GitHub issue:

1. **Map AC to implementation:** Identify which files/changes address each criterion
2. **Verify completeness:** Confirm the implementation fully satisfies the criterion
3. **Check edge cases:** Validate that boundary conditions mentioned in AC are handled
4. **Document gaps:** Flag any AC that appear unaddressed or partially implemented

**Output format:**
| AC # | Criterion Summary | Status | Evidence (files/lines) | Notes |
|------|-------------------|--------|------------------------|-------|

---

### Step 3: Code Quality Analysis

Run quality analysis on all changed files:

1. **Execute Codacy CLI analysis** on each modified file
2. **Review for:**
   - Linting violations
   - Security vulnerabilities
   - Code smell patterns
   - Test coverage gaps
3. **Verify all tests pass** locally (unit + integration)
4. **Confirm no quality gate regressions** compared to baseline

---

### Step 4: Duplication Assessment

Analyze changed code for duplication:

1. **Intra-file duplication:** Repeated patterns within the same file
2. **Cross-file duplication:** Similar logic across multiple changed files
3. **Existing codebase conflicts:** New code that duplicates existing utilities or patterns
4. **Recommendation:** For each duplication found, suggest extraction or reuse strategy

**Duplication checklist:**
- [ ] No copy-paste patterns detected
- [ ] Shared utilities used where available
- [ ] Configuration values externalized appropriately
- [ ] Common abstractions identified and applied

---

### Step 5: Complexity Evaluation

Assess complexity of changed code:

1. **Method-level complexity:**
   - Cyclomatic complexity within acceptable thresholds
   - Methods are focused and single-purpose
   - No excessive branching or nesting
2. **Class-level complexity:**
   - High cohesion maintained
   - Dependencies are minimal and explicit
   - Clear separation of concerns
3. **Architectural complexity:**
   - Changes align with existing patterns
   - No unnecessary new abstractions introduced
   - Integration points are clean and well-defined

**Complexity indicators to flag:**
- Methods exceeding 20 lines
- Nesting depth > 3 levels
- Parameter count (flag if > 4)
- Classes with > 5 dependencies
- Cyclomatic complexity > 10

---

### Step 6: Business Logic Clarity

Review business logic transparency:

1. **Intent verification:** Is the "why" behind each decision clear from code or comments?
2. **Domain language:** Does the code use consistent terminology matching the ticket/domain?
3. **Assumption surfacing:** Are hidden assumptions documented?
4. **Traceability:** Can business rules be traced back to ticket requirements?

**Questions to answer for unclear logic:**
- What business rule does this implement?
- Why was this approach chosen over alternatives?
- What happens in edge/error cases?

---

### Step 7: Pre-Push Checklist

Before approving for push, confirm:

**Quality Gates:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Linting/formatting passes
- [ ] Codacy analysis shows no new issues
- [ ] No unresolved TODO markers without ticket references

**Acceptance Criteria:**
- [ ] All AC verified and mapped to implementation
- [ ] Edge cases from AC are handled
- [ ] No AC gaps identified (or gaps documented with justification)

**Code Health:**
- [ ] No significant duplication introduced
- [ ] Complexity within acceptable thresholds
- [ ] Business logic is clear and documented where needed
- [ ] API changes are documented (if applicable)

**Documentation:**
- [ ] README updated if behavior changes
- [ ] Inline comments for complex logic
- [ ] Changelog entry added (if required by project)

---

## Review Summary Template

```markdown
## Review Summary: {{jiraTicket}}

### Acceptance Criteria Status
- **Total AC:** X
- **Verified:** X
- **Gaps:** X

### Quality Metrics
- **Codacy Issues:** X new / X resolved
- **Test Status:** PASS/FAIL
- **Lint Status:** PASS/FAIL

### Code Health
- **Duplication:** None / Minor / Significant
- **Complexity:** Low / Medium / High
- **Business Logic Clarity:** Clear / Needs Comments / Unclear

### Recommendation
- [ ] ✅ Ready to push
- [ ] 🟡 Ready with minor improvements suggested
- [ ] 🔴 Blocked - issues must be resolved

### Action Items (if any)
1. ...
```

---

## Escalation Triggers

Flag for human review if:
- Any AC cannot be verified from the changes
- Security vulnerabilities detected
- Significant architectural concerns
- Business logic appears incorrect or unclear
- Test coverage decreased significantly
