# 0002 — Authenticate the SPA with HttpOnly session cookies

- Status: Accepted (2026-11-15); implementation scheduled for Phase 5 ([SEC-5](../AUDIT.md#sec-5))
- Date: 2026-11-15

## Context

The SPA stores a DRF `TokenAuthentication` token in `localStorage` and sends it as `Authorization: Token …`. DRF tokens never expire and can only be revoked by explicit logout. Any XSS or compromised npm dependency can read the token and keep API access indefinitely. `SessionAuthentication`, `CORS_ALLOW_CREDENTIALS` and `CSRF_TRUSTED_ORIGINS` are already configured. See [SEC-5](../AUDIT.md#sec-5).

Options considered:

| Option | XSS exposure | Expiry / revocation | Work |
|---|---|---|---|
| Keep DRF tokens in `localStorage` | token readable by any script | none | none |
| Expiring tokens (Knox / SimpleJWT) in memory + refresh cookie | short-lived token readable | yes | medium; refresh flow in SPA |
| **Django session cookie (HttpOnly, Secure, SameSite=Lax) + CSRF header** | cookie not readable by script | server-side, per session | small; same-site deployment |

## Decision

Use Django sessions. The SPA and API are served from the same site (nginx in Phase 5), so cookies are first-party. The SPA reads `csrftoken` and sends `X-CSRFToken` on unsafe methods. `TokenAuthentication` stays enabled only for scripted/API clients, if any.

## Consequences

- Login/logout endpoints set/clear the session; `AuthContext` stops touching `localStorage`.
- "Remember me" maps to `request.session.set_expiry()`.
- Local development keeps working through the Vite proxy (same origin).
- Requires the same-site deployment from [OPS-3](../AUDIT.md#ops-3); a cross-site API domain would need `SameSite=None` and is out of scope.
