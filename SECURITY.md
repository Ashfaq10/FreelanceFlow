# Security Policy

## Reporting a vulnerability

Do not open a public issue. Use GitHub's **Report a vulnerability** (Security → Advisories) on this repository, or email the maintainer listed on the GitHub profile. Include steps to reproduce and the affected endpoint or file. Expect an acknowledgement within 3 business days.

## Supported versions

Only `main` is supported. The project has not had a production release yet.

## Known open issues

Phase 1 closed the issues that allowed cross-user access, forged revenue or stored XSS (SEC-1, SEC-2, SEC-3, SEC-4, SEC-8, PAY-1 and related; see [docs/AUDIT.md](docs/AUDIT.md)). What is still open is tracked in [PHASES.md](PHASES.md). **Do not deploy to production until Phase 5 is complete.**

| ID | Issue | Phase |
|---|---|---|
| [SEC-5](docs/AUDIT.md#sec-5) | Non-expiring API tokens in `localStorage` | 5 |
| [SEC-6](docs/AUDIT.md#sec-6) | Unsigned S3 URLs for invoice PDFs | 5 |
| (by design) | The client page `/pay/<token>` is a capability link: anyone holding it can view and pay that one invoice. It is permanent and cannot be revoked yet | 6 |

## Secrets

- `.env`, `.env.prod`, `.env.prod.db` are gitignored. Never commit real keys; `.env.example` holds placeholders only.
- Use Stripe **test** keys outside production.
- If a secret is ever committed, rotate it first, then remove it from history.
