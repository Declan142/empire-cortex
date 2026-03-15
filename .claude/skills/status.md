---
name: status
description: Show Empire status — active tasks, token usage, agent activity, and recent audit events.
user_invocable: true
---

# /status — Empire Dashboard

Show a quick status overview of the Empire.

## Instructions
When the user runs `/status`, gather and display:

1. **Read progress.json** — show current session goal, active/blocked/completed tasks
2. **Read audit log** — show last 10 tool events (timestamp, agent, tool)
3. **Git status** — uncommitted changes, current branch, recent commits
4. **Token estimate** — count audit log entries to estimate burn rate
5. **Agent activity** — which agents ran recently, how many turns each

Format as a clean summary:
```
EMPIRE STATUS — {timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Goal: {current goal}
Tasks: {N active} | {N blocked} | {N done}
Branch: {current branch}
Last agent: {name} ({N} turns ago)
Token burn: ~{N}K estimated this session
Alerts: {guardian alerts or "none"}
```
