# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/). Reference the [audit](docs/AUDIT.md) ID in each entry.

## [Unreleased]

### Added
- `python manage.py seed_demo [--reset]`: demo account with 6 clients, 19 invoices across all statuses, payments and time logs over the last 8 months (OPS-11). Refuses to run unless `DEBUG=True`, since the demo password is public.
- Agent guardrails: [.claude/rules/](.claude/rules/) (code style, security) and `.claude/settings.json` deny rules; [PLAN.md](PLAN.md), [BACKLOG.md](BACKLOG.md), [MEMORY.md](MEMORY.md), [SESSIONS.md](SESSIONS.md).
- Project tracking docs: [PHASES.md](PHASES.md) roadmap, [docs/AUDIT.md](docs/AUDIT.md) findings, [docs/API.md](docs/API.md), [docs/DESIGN.md](docs/DESIGN.md), [ADRs](docs/adr/), [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), PR template.
- `backend/static/.gitkeep` so fresh clones pass Django's `staticfiles.W004` check.

### Changed
- README rewritten to match the code: correct ports and commands, honest project status, links to the roadmap (OPS-10).
- Single root `.env.example` covering SQLite/Postgres, SMTP/SendGrid, Stripe and S3 (OPS-6).

### Removed
- `backend/fixtures/sample_data.json`: its only user had a placeholder password hash and could never log in (OPS-11).
- `backend/.env.example` (merged into the root file), stray `Untitled` file (Figma link moved to `docs/DESIGN.md`), empty `FreelanceFlow/` directory.
