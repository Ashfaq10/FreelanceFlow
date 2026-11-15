# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- Start of session: latest [SESSIONS.md](SESSIONS.md) entry → [BACKLOG.md](BACKLOG.md) "Now". End of session: update both, plus [MEMORY.md](MEMORY.md) if you learned something.
- One BACKLOG item per session/PR.
- `.claude/rules/code-style.md` and `.claude/rules/security.md` load automatically; `.claude/settings.json` hard-denies reading `.env*`, force-pushes, `reset --hard` and `flush`, and asks before `rm -rf`, `git push`, and installs.
- Useful installed skills for this repo: `systematic-debugging` (bugs), `test-driven-development` (every fix), `ponytail-review` (before PR), `webapp-testing` / `playwright-cli` (UI verification), `api-design-principles` (new endpoints), `accessibility-review` (Phase 4 UX items).
- Verify UI changes in a real browser against `npm run dev` + `runserver` with the `seed_demo` account, not only by reading code.
- Personal, uncommitted notes go in `CLAUDE.local.md` (gitignored; this repo has one for the owner's machine).
