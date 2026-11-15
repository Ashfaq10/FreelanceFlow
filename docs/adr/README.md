# Architecture Decision Records

Short records of decisions that are expensive to reverse. One file per decision, numbered, never renumbered. Supersede instead of editing a decided record.

| # | Title | Status |
|---|---|---|
| [0001](0001-api-only-backend.md) | Backend is API-only; the React SPA is the only UI | Proposed |
| [0002](0002-auth-session-cookies.md) | Authenticate the SPA with HttpOnly session cookies | Proposed |

## Template

```markdown
# NNNN — Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context
What forces are at play; what is true today (link AUDIT IDs).

## Decision
What we will do, stated plainly.

## Consequences
What gets easier, what gets harder, what we must now do.
```
