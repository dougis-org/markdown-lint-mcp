---
mode: code-review
description: 'Review a pull request against GitHub issue acceptance criteria with focus on code quality.'
---

# Review Pull Request

Review a GitHub pull request against the requirements and acceptance criteria from a GitHub issue, acting as a senior code reviewer focused on quality, maintainability, and correctness.

## Required Inputs

**GitHub Issue:** {{issueNumber}}
**Pull Request:** {{pullRequest}}

> ⚠️ This prompt requires:
> - A valid GitHub issue number containing acceptance criteria
> - A pull request reference in one of these formats:
>   - PR URL: `https://github.com/owner/repo/pull/123`
>   - Owner/repo + PR number: `owner/repo#123`

---

## Review Workflow

### Step 1: Gather Context

1. **Fetch GitHub issue details** using GitHub API for the provided issue number
2. **Extract and document:**
   - Summary and description
   - Acceptance Criteria (AC)
   - Linked requirements or specifications
   - Business context and stakeholder expectations
3. **Fetch PR details** using GitHub tools:
   - PR title, description, and linked issues
   - List of changed files
   - Diff content for each file
   - Existing review comments (if any)
   - CI/CD status checks

---

### Step 2: PR Metadata Validation

Verify PR hygiene before diving into code:

1. **Title and description:**
   - Title follows project conventions
   - Description explains the "what" and "why"
   - Jira ticket is linked or referenced
2. **Scope appropriateness:**
   - Changes are focused on the ticket scope
   - No unrelated changes bundled in
   - PR size is reviewable (flag if > 500 lines changed)
3. **Branch and target:**
   - Source branch naming follows conventions
   - Target branch is appropriate

---

### Step 3: Acceptance Criteria Validation

For each acceptance criterion from the GitHub issue:

1. **Map AC to changes:** Identify which files/diffs address each criterion
2. **Verify completeness:** Confirm the implementation fully satisfies the criterion
3. **Check edge cases:** Validate that boundary conditions mentioned in AC are handled
4. **Document gaps:** Flag any AC that appear unaddressed or partially implemented

**Output format:**
| AC # | Criterion Summary | Status | Evidence (files/lines) | Notes |
|------|-------------------|--------|------------------------|-------|

---

### Step 4: Code Quality Review

Review each changed file for quality standards:

#### 4.1 Readability & Maintainability
- [ ] Code is self-documenting with clear naming
- [ ] Complex logic has explanatory comments
- [ ] Consistent style with existing codebase
- [ ] No dead code or commented-out blocks

#### 4.2 Design & Architecture
- [ ] Single responsibility principle followed
- [ ] Appropriate abstraction level
- [ ] Dependencies are minimal and explicit
- [ ] Changes align with existing patterns

#### 4.3 Error Handling
- [ ] Errors are handled appropriately
- [ ] Error messages are informative
- [ ] Failure modes are considered
- [ ] No swallowed exceptions

#### 4.4 Security Considerations
- [ ] No hardcoded secrets or credentials
- [ ] Input validation where applicable
- [ ] No obvious injection vulnerabilities
- [ ] Sensitive data handled appropriately

---

### Step 5: Duplication Analysis

Examine the PR diff for duplication:

1. **Within the PR:** Repeated patterns across changed files
2. **Against existing code:** New code that duplicates existing utilities
3. **Copy-paste indicators:** Similar blocks with minor variations

**For each duplication found:**
- Severity: Minor / Moderate / Significant
- Location: File(s) and line ranges
- Recommendation: Extract utility, use existing, or accept with justification

---

### Step 6: Complexity Assessment

Evaluate complexity of changes:

1. **Method-level metrics:**
   - Cyclomatic complexity (flag if > 10)
   - Method length (flag if > 20 lines)
   - Parameter count (flag if > 4)
   - Nesting depth (flag if > 3 levels)

2. **Class-level metrics:**
   - Number of dependencies (flag if > 5)
   - Cohesion assessment
   - Coupling with other components

3. **Change complexity:**
   - Cognitive load to understand changes
   - Risk assessment for the modifications

---

### Step 7: Test Coverage Review

Validate testing in the PR:

1. **Test presence:**
   - [ ] New functionality has corresponding tests
   - [ ] Bug fixes include regression tests
   - [ ] Edge cases are tested

2. **Test quality:**
   - [ ] Tests are meaningful (not just coverage padding)
   - [ ] Test names describe behavior
   - [ ] Assertions are specific and complete
   - [ ] No flaky test patterns

3. **Coverage impact:**
   - Note any decrease in coverage
   - Identify untested paths in new code

---

### Step 8: Business Logic Validation

Verify business logic clarity and correctness:

1. **Intent alignment:** Does the implementation match ticket requirements?
2. **Domain accuracy:** Are business terms used correctly?
3. **Edge case handling:** Are business edge cases addressed?
4. **Logic correctness:** Does the logic produce expected outcomes?

**Questions to raise for unclear logic:**
- What business rule does this implement?
- Is this behavior documented or specified?
- How does this interact with existing business rules?

---

### Step 9: Generate Review Comments

For each issue found, prepare a review comment:

**Comment structure:**
```
**[Severity]** Category

Description of the issue or suggestion.

**Why it matters:** Brief explanation of impact.

**Suggestion:** Specific recommendation or code example.
```

**Severity levels:**
- 🔴 **Blocking:** Must be resolved before merge
- 🟡 **Warning:** Should be addressed, may defer with justification  
- 🟢 **Suggestion:** Nice-to-have improvement
- 💡 **Praise:** Highlight good patterns (don't skip this!)

---

## Review Summary Template

```markdown
## PR Review Summary

**PR:** {{pullRequest}}
**Ticket:** {{jiraTicket}}
**Reviewer:** AI Code Review Agent
**Date:** [current date]

### Acceptance Criteria Verification
| AC # | Summary | Status |
|------|---------|--------|
| 1 | ... | ✅/⚠️/❌ |

**AC Coverage:** X of Y criteria verified

### Code Quality Assessment

| Category | Rating | Notes |
|----------|--------|-------|
| Readability | ⭐⭐⭐⭐⭐ | |
| Design | ⭐⭐⭐⭐⭐ | |
| Error Handling | ⭐⭐⭐⭐⭐ | |
| Security | ⭐⭐⭐⭐⭐ | |
| Test Coverage | ⭐⭐⭐⭐⭐ | |

### Issue Summary
- 🔴 Blocking: X
- 🟡 Warnings: X
- 🟢 Suggestions: X
- 💡 Praise: X

### Duplication & Complexity
- **Duplication:** None / Minor / Significant
- **Complexity:** Low / Medium / High
- **Risk Level:** Low / Medium / High

### Recommendation
- [ ] ✅ **Approve** - Ready to merge
- [ ] 🟡 **Request Changes** - Issues must be addressed
- [ ] 💬 **Comment** - Questions or suggestions only

### Detailed Findings
[List each comment with file, line, and content]
```

---

## Escalation Triggers

Immediately flag for human reviewer attention if:
- Any blocking security vulnerability detected
- AC cannot be verified from the changes
- Significant architectural concerns
- Business logic appears incorrect
- Test coverage decreased significantly
- PR scope significantly exceeds ticket scope

---

## Post-Review Actions

After completing the review:

1. **If using GitHub review tools:** Submit review with appropriate status
2. **Document findings:** Ensure all comments are posted to the PR
3. **Update Jira (if applicable):** Add comment with review summary link
4. **Communicate blockers:** Ensure blocking issues are clearly highlighted
