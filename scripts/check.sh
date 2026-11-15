#!/usr/bin/env bash
# Everything CI runs, locally, in one command. Usage: scripts/check.sh [--pg]
#   --pg  run the backend tests against the compose Postgres (`docker compose up -d db`)
#         instead of in-memory SQLite. CI uses Postgres, and it enforces constraints
#         SQLite ignores (field lengths, strict types), so run it before pushing.
set -euo pipefail
cd "$(dirname "$0")/.."

PY=backend/venv/Scripts/python.exe
[ -x "$PY" ] || PY=backend/venv/bin/python

if [ "${1:-}" = "--pg" ]; then
    docker compose up -d db
    export TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/freelanceflow
    until docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
fi

echo '== backend: format, lint, tests'
(cd backend && "../$PY" -m black --check apps)
(cd backend && "../$PY" -m isort --check-only apps)
(cd backend && "../$PY" -m flake8 apps --count)
(cd backend && "../$PY" -m pytest -q)

echo '== frontend: lint, tests, build'
(cd frontend && npm run lint && npm run format:check && npm test && npm run build)

echo '== all green'
