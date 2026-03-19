---
name: weekly-report
description: "Generate a weekly Empire status report — commits, PRs, agent activity, token usage. Use when user asks for a weekly summary or progress report."
disable-model-invocation: true
context: fork
agent: general-purpose
---

# /weekly-report — Weekly Empire Report

Generate the weekly status report.

## Data Sources

1. `git log --oneline --since="7 days ago"` — recent commits
2. `gh pr list --state all --json number,title,state,mergedAt --limit 20` — PR activity
3. `.claude/artifacts/audit/log.jsonl` — count events from past 7 days
4. `.claude/artifacts/progress.json` — task stats
5. Guardian alerts in artifacts

## Output

Use template: ${CLAUDE_SKILL_DIR}/templates/report-template.md

Save to: `.claude/artifacts/tasks/weekly-{date}/report.md`

## Gotchas

- `gh` may not be authenticated — handle gracefully, skip PR section
- Audit log may not exist — skip that section with a note
- Git history may span multiple branches — use `--all` flag
- Don't count merge commits as real work
