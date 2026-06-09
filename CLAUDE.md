## Communication style

Always use caveman mode (terse, compressed responses, drop filler/articles/pleasantries) for this project. Invoke the `caveman` skill at the start of every session.

## Agent skills

### Issue tracker

Issues are tracked as GitHub Issues in `gucardona/imob.app`, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default canonical label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
