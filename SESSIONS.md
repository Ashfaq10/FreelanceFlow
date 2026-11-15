# Sessions

Handoff log between work sessions (human or agent). Newest first. At the **end** of every session add an entry; at the **start** of a new one, read the latest entry, then [BACKLOG.md](BACKLOG.md).

Entry template:

```markdown
## YYYY-MM-DD — short title
**Goal:** what this session set out to do.
**Done:** bullets with IDs / files.
**State:** what's half-finished, branch name, failing checks.
**Next:** the exact first action for the next session.
**Open questions:** decisions needed from the owner.
```

---

## 2026-11-15 — Audit, cleanup, planning docs

**Goal:** audit the whole repo, remove junk, write the improvement plan and tracking docs.

**Done:**
- Full audit → [docs/AUDIT.md](docs/AUDIT.md) (72 findings); roadmap → [PHASES.md](PHASES.md).
- Measured baseline: pytest 9 failed / 23 passed; `npm run lint` 16 errors / 12 warnings; backend black 64 files, isort 14, flake8 154; `npm run build` passes (812 KB chunk).
- Removed: root `venv/`, `FreelanceFlow/`, `Untitled`, `frontend/dist/`, `__pycache__/`, `backend/.env.example`, `backend/fixtures/sample_data.json`, old `db.sqlite3` and `media/logos/`.
- Added `seed_demo` command; fresh SQLite DB seeded (`demo@freelanceflow.dev` / `demo-pass-2026`).
- Installed `requirements-dev.txt` into `backend/venv`.
- Docs: README, PLAN, BACKLOG, PHASES, MEMORY, SESSIONS, AGENTS, CLAUDE, CHANGELOG, CONTRIBUTING, SECURITY, docs/API, docs/DESIGN, docs/adr/*, PR template.

**State:** committed and pushed to `main` as `chore: audit, cleanup and planning docs`. Pre-push check: no secrets in tree or history; `.env`, `CLAUDE.local.md`, `db.sqlite3`, `backend/venv/` stay local. Repo is public; app is not deployed anywhere (owner confirmed), so publishing AUDIT.md is acceptable. No application bug fixed yet.

**Next:** start BACKLOG "Now": [TEST-2](docs/AUDIT.md#test-2) → [TEST-1](docs/AUDIT.md#test-1) → [OPS-1](docs/AUDIT.md#ops-1). If the app is ever deployed publicly before Phase 1 is done, make the repo private or move AUDIT.md details out first.

### Open questions

1. **Product name:** "Penough" (logos, title, login) or "FreelanceFlow" (README, signup, emails)? Blocks [UX-6](docs/AUDIT.md#ux-6).
2. **Quote style for the backend formatter:** adopt black's double quotes (one big reformat commit) or keep single quotes with `skip-string-normalization`? Blocks [OPS-2](docs/AUDIT.md#ops-2).
3. **Python version:** Dockerfile/CI say 3.11, local venv is 3.13. Pick one (3.12 is a safe middle) — [OPS-8](docs/AUDIT.md#ops-8).
4. **ADRs 0001 and 0002:** accept as proposed?
