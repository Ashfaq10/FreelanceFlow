## What & why

<!-- One or two sentences. Link the finding: Closes AUDIT ID, e.g. DATA-3 -->
Audit ID(s):

## How it was verified

<!-- Test names, commands run, browser steps with the seed_demo account. -->

## Checklist

- [ ] Regression test fails before / passes after
- [ ] `pytest`, `flake8`, `black --check`, `isort --check-only` pass (backend)
- [ ] `npm run lint`, `npm run format:check` and `npm run build` pass (frontend)
- [ ] Money stays `Decimal`; queries scoped to `request.user`; multi-row writes atomic
- [ ] PHASES.md box ticked, CHANGELOG.md updated, docs/API.md updated if an endpoint changed
- [ ] New migration added (never edited an existing one) — or none needed
