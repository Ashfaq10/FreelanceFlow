# Security rules for agents

Hard constraints. The deny list in `.claude/settings.json` enforces part of this for Claude Code; the rest relies on you. When a task seems to require breaking a rule, stop and ask.

## Never

**Secrets**
- Never read, print, copy, or summarize `.env`, `.env.prod`, `.env.prod.db`, `*.pem`, `*.key`, `credentials.json`. Use `.env.example` to learn which variables exist.
- Never write a real key, token, password, or webhook secret into any tracked file, test, fixture, log line, or commit message.
- Never use live Stripe keys (`sk_live_`, `pk_live_`). Test mode only.

**Destructive commands** (ask first, every time)
- `rm -rf` on anything other than build output or caches (`frontend/dist`, `__pycache__`, `.pytest_cache`, `htmlcov`).
- Deleting `db.sqlite3`, `media/`, or a venv; `manage.py flush`; `migrate <app> zero`; dropping tables; editing applied migrations.
- `git push --force` / `-f`, `git reset --hard`, `git clean -fdx`, `git branch -D`, rewriting history, pushing to `main` directly. Don't `git push` at all unless asked.
- Killing processes you didn't start.

**Running against real systems**
- Never run code with `DJANGO_SETTINGS_MODULE=config.settings.production` against real infrastructure, or point local code at a production database, bucket, or Redis.
- Never send real email. Locally the console backend is the default; seed and test data use `example.com` addresses.
- Never pipe remote scripts into a shell (`curl … | sh`).

**Weakening protections to make something pass**
- Don't disable or loosen: CSRF, `IsAuthenticated`, queryset scoping by user, password validators, throttles, Stripe signature verification, model/serializer validation.
- Don't skip, xfail, or delete a failing test to get green unless the test exercises dead code being removed in the same change (and say so).
- Don't add `|safe`, `mark_safe`, `dangerouslySetInnerHTML`, `eval`, or raw SQL with string formatting on user-controlled data.
- Don't broaden `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, or `CSRF_TRUSTED_ORIGINS` to `*`.

## Always

- New endpoints: authenticated by default, scoped to `request.user`, with a cross-user test ([SEC-1](../../docs/AUDIT.md#sec-1)).
- Uploaded files: validate content (Pillow for images), allowlist types, cap size ([SEC-3](../../docs/AUDIT.md#sec-3)).
- Webhooks and Celery tasks: verify input, idempotent, safe to retry ([PAY-1](../../docs/AUDIT.md#pay-1)).
- Report any secret you find in the repo or history immediately; rotation comes before cleanup.

Vulnerability reporting for humans: [SECURITY.md](../../SECURITY.md).
