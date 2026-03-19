---
name: status
description: "Show Empire status dashboard — active tasks, git state, agent activity, recent audit events. Use when user asks about current state, progress, what's happening, or system health."
---

# /status — Empire Dashboard

Gather and display a quick status overview.

## Steps

1. **Progress state** — read `.claude/artifacts/progress.json` or per-agent files in `.empire/progress/`
2. **Git state** — run `git log --oneline -5` and `git status -s`
3. **Audit trail** — read last 10 lines of `.claude/artifacts/audit/log.jsonl`
4. **Guardian alerts** — check for any flagged anomalies in artifacts

## Output Format

```
EMPIRE STATUS — {timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Branch:  {current branch}
Tasks:   {active} active | {done} done | {blocked} blocked
Recent:  {last 3 commits one-line}
Agents:  {who ran recently}
Alerts:  {guardian alerts or "all clear"}
```

## Gotchas

- progress.json may not exist yet — show "No state file found" gracefully
- Audit log can be huge — only read last 10 lines via `tail`, not the whole file
- Git status in worktrees shows different info — check `git rev-parse --is-inside-work-tree`
- If in a fresh session with no artifacts, say so — don't error out
