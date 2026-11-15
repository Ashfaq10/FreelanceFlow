# Contributing

## Workflow

1. Pick an unchecked item in [PHASES.md](PHASES.md) (current phase first). Its ID links to the finding in [docs/AUDIT.md](docs/AUDIT.md).
2. Branch from `main`: `fix/data-3-quantize-tax`, `feat/pay-2-checkout-api`, `chore/ops-1-ci-paths`.
3. Write the failing test first, then the fix.
4. Run the checks below locally.
5. Open a PR using the template; one PHASES item per PR.
6. In the same PR: tick the PHASES box, add a CHANGELOG line under `Unreleased`, update [docs/API.md](docs/API.md) if an endpoint changed, and write an ADR in [docs/adr/](docs/adr/) for any decision that is expensive to reverse.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) with the audit ID:

```
fix(invoices): quantize tax and totals to cents (DATA-3)
feat(payments): add authenticated checkout endpoint (PAY-2)
chore(ci): run backend jobs from backend/ (OPS-1)
```

Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `build`.

## Checks before pushing

```bash
# backend/
venv/Scripts/python -m pytest
venv/Scripts/python -m flake8 apps
venv/Scripts/python -m black --check apps
venv/Scripts/python -m isort --check-only apps
venv/Scripts/python manage.py makemigrations --check --dry-run

# frontend/
npm run lint
npm run build
```

## Definition of done

- [ ] Behaviour works end to end (API + SPA), verified in the browser for UI changes
- [ ] Regression test fails before, passes after
- [ ] Money stays `Decimal`; queries scoped to `request.user`; multi-row writes atomic (see [AGENTS.md](AGENTS.md#rules-that-protect-money-and-data))
- [ ] No new lint warnings; no new dependencies without a reason in the PR
- [ ] PHASES.md, CHANGELOG.md and docs updated

## Code review

Reviewers check, in order: correctness → security/data scoping → tests → performance → simplicity. Request changes for missing tests on `Must` items; leave style to the formatters.
