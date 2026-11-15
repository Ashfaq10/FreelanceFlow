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

## 2026-11-15 — Phase 2: broken user flows (17/17)

**Goal:** close every Phase 2 item, one commit per item or tight group, pushed to `main` with CI green.

**Done:**
- BUG-1…BUG-8 earlier in the session: login errors, client totals, optional hourly rate, Mark Paid on overdue, one `formatCurrency` + `currency_symbol` in emails, real password reset, pagination everywhere, 401-only logout.
- BUG-9 one `send_invoice` task (mark sent → render PDF → email); stored PDF dropped on every status change; sending without items is a 400; the UI says "Queued".
- BUG-10 delete only on drafts + API error text surfaced; BUG-11 server-side client `?search=`.
- BUG-12 `?client=` preselect (re-applied after the options load); BUG-13 `utils/dates.js` local date parsing/defaults; BUG-14 `Number(...) > 0` guards in Reports.
- BUG-15 `ui/ErrorState` with retry on five pages, `Promise.allSettled` on the Dashboard, and `PrivateRoute` no longer bounces you to `/login` when the API is unreachable.
- BUG-16 "Due Date" label, receipt text only when paid, `Invoice.pdf_color` (migration `0009`) used by download *and* email; BUG-17 validated query params.
- Tests: 86 → 122 backend, 9 → 16 frontend. New: `test_client_search`, `test_pdf_render`, `test_query_params`, `utils/dates.test.js`.
- Browser-verified: draft-only delete, send queueing, preselect, error states with the API stopped, 400s for bad params, "DUE DATE" in a rendered PDF.

**State:** Phases 0–2 done. `main` is the only branch. Known gap written up under [OPS-9](docs/AUDIT.md#ops-9): with Redis down, `POST /send/` hangs instead of returning the 503 the view is ready to send — kombu/redis-py keep retrying and the publish never raises.

**Next:** Phase 3, BACKLOG "Now": [PAY-2](docs/AUDIT.md#pay-2) authenticated Stripe checkout from the SPA.

**Open questions:** local `backend/venv` is still Python 3.13 (Django 4.2 supports ≤3.12) — rebuild it; Docker Desktop has been down all session, so image builds are only exercised by CI.


## 2026-11-15 — Phase 1: security & money integrity

**Goal:** close every Phase 1 item (14), after adding the dev tooling that was missing.

**Done:** (one commit per item or tight group, all pushed to `main`)
- Tooling: `scripts/check.sh` (`--pg` for Postgres), pre-commit hooks (black/isort/flake8/eslint), Dependabot.
- SEC-1 related fields scoped to `request.user`; SEC-2 production requires `SECRET_KEY`/`ALLOWED_HOSTS` + proxy TLS header.
- SEC-3 Pillow-validated logo uploads, old file deleted; SEC-4 auth throttles + password validators + lower-cased emails; SEC-7 toolbar dev-only; SEC-8 currency `ChoiceField`.
- DATA-1 `Invoice.client` `PROTECT`, 409 on delete, SPA archives; DATA-2 status state machine + cancel endpoint; DATA-3 `to_cents` both sides; DATA-4 atomic writes + `bulk_create`, signals deleted; DATA-5 fractional quantities and bounded discount/tax; DATA-6 draft dates kept.
- PAY-1 idempotent, amount-checked Stripe webhook.
- Tests: 25 → 86 backend, 9 frontend. New files: `test_scoping`, `test_money`, `test_transitions`, `test_invoice_writes`, `test_invoice_validation`, `test_clients`, `test_webhook`, `test_accounts`, `test_auth`, `utils/money.test.js`.
- Browser-verified against the running app: money parity (1.5 × 0.33 → $0.50 on screen and saved), draft dates on edit, 409 + archive flow.

**State:** Phase 1 done (14/14); CI green on `main` (run 43707497190). Migrations 0007 (validators) and 0008 (`PROTECT`) applied locally and in CI. Docker Desktop was down all session, so the image build was only ever exercised by CI — it caught two failures (`libgdk-pixbuf2.0-0`, then the missing `debug_toolbar` during `collectstatic`).

**Next:** Phase 2, BACKLOG "Now": [BUG-1](docs/AUDIT.md#bug-1) login errors, [BUG-2](docs/AUDIT.md#bug-2) client totals field names, [BUG-3](docs/AUDIT.md#bug-3) time-log rate.

### Open questions

1. ~~**Product name**~~ — resolved 2026-11-15: product **FreelanceFlow**, maker **Penough**; applied ([UX-6](docs/AUDIT.md#ux-6)). Still unverified: domain and trademark availability.
2. ~~**Python version**~~ — resolved: pinned to **3.12** everywhere (`.python-version`, Dockerfile, CI, mypy). **Action for the owner: rebuild `backend/venv` on 3.12**; it is still 3.13, which Django 4.2 does not support.
3. ~~**ADRs 0001 and 0002**~~ — both Accepted 2026-11-15. ADR-0001 unblocks LEAN-1 (Phase 4); ADR-0002 is implemented in Phase 5 ([SEC-5](docs/AUDIT.md#sec-5)).
4. ~~**`main` protection**~~ — resolved: the `git push origin main` deny rule is gone from `.claude/settings.json`. Optional next step on GitHub: require the CI check before merge.
5. ~~**`TimeLog.client`**~~ — resolved: deleting a client with time logs returns 409 too; archive is the universal exit.

---

## 2026-11-15 — Phase 0 baseline

**Goal:** finish Phase 0: green tests, green lint, working CI, frontend test setup.

**Done:** (one commit each, local `main`)
- TEST-2 `config/settings/test.py`, `pytest.ini` → test settings; `TEST_DATABASE_URL` selects Postgres.
- TEST-1 pytest 25 passed / 0 failed (deleted all 7 dead-view tests, fixed 5).
- OPS-1 CI: `backend/` working dir, Postgres via `TEST_DATABASE_URL`, frontend job, Docker build from `./backend`.
- OPS-2 formatting-only commit `65c4a55` (black single quotes + isort) then flake8 0; frontend `npm run lint` 0 problems.
- OPS-12/13 Celery defaults to local settings; `lib/` ignore anchored.
- TEST-4 Vitest + RTL + MSW, 3 tests on `api/client.js`; `npm test` in CI.
- Smoke-checked the refactored effects in the browser (clients, invoices list/detail/edit/new, settings, dashboard): pages load, no refetch loops.
- Pushed; three follow-up fixes for things only CI could show: `ubuntu-latest` is Ubuntu 26.04 and dropped `libgdk-pixbuf2.0-0` (removed from the workflow and the Dockerfile — WeasyPrint 60 does not use it), and `ClientFactory.phone` exceeded `max_length=20` on Postgres.

**State:** Phase 0 done. CI green on `main` (run 43703445329): lint, frontend, test (Postgres), build. Local checks green too.

**Next:** BACKLOG "Now": [SEC-1](docs/AUDIT.md#sec-1) — scope serializer querysets to `request.user`, with a cross-user regression test.

### Open questions

1. **Product name:** Penough vs FreelanceFlow — [UX-6](docs/AUDIT.md#ux-6).
2. **Python version:** CI/Docker 3.11, local venv 3.13 — [OPS-8](docs/AUDIT.md#ops-8).
3. **ADRs 0001 and 0002:** accept as proposed?

Resolved: backend quote style → keep single quotes (owner, 2026-11-15).

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
