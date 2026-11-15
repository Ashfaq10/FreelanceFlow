# Security Policy

## Reporting a vulnerability

Do not open a public issue. Use GitHub's **Report a vulnerability** (Security → Advisories) on this repository, or email the maintainer listed on the GitHub profile. Include steps to reproduce and the affected endpoint or file. Expect an acknowledgement within 3 business days.

## Supported versions

Only `main` is supported. The project has not had a production release yet.

## Known open issues

These are already tracked publicly in [docs/AUDIT.md](docs/AUDIT.md) and scheduled in [PHASES.md](PHASES.md) (Phase 1 and Phase 5). **Do not deploy to production until Phase 1 is complete.**

| ID | Issue | Phase |
|---|---|---|
| [SEC-1](docs/AUDIT.md#sec-1) | Invoice/time-log writes accept another user's client or invoice ID | 1 |
| [SEC-2](docs/AUDIT.md#sec-2) | Production falls back to a public default `SECRET_KEY` | 1 |
| [SEC-3](docs/AUDIT.md#sec-3) | Logo upload trusts client content type (stored XSS) | 1 |
| [SEC-4](docs/AUDIT.md#sec-4) | No auth rate limiting; password validators skipped on signup | 1 |
| [SEC-8](docs/AUDIT.md#sec-8) | Unvalidated currency code can multiply Stripe charges | 1 |
| [PAY-1](docs/AUDIT.md#pay-1) | Stripe webhook not idempotent; amount not verified | 1 |
| [SEC-5](docs/AUDIT.md#sec-5) | Non-expiring API tokens in `localStorage` | 5 |
| [SEC-6](docs/AUDIT.md#sec-6) | Unsigned S3 URLs for invoice PDFs | 5 |

## Secrets

- `.env`, `.env.prod`, `.env.prod.db` are gitignored. Never commit real keys; `.env.example` holds placeholders only.
- Use Stripe **test** keys outside production.
- If a secret is ever committed, rotate it first, then remove it from history.
