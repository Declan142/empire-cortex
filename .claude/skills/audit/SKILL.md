---
name: audit
description: "Show the audit trail — recent tool calls, blocked operations, agent activity. Use when investigating what happened, debugging issues, or reviewing agent behavior."
---

# /audit — Audit Trail Viewer

Show recent audit log entries and highlight anomalies.

## Steps

1. Read `.claude/artifacts/audit/log.jsonl` — last 25 entries
2. Parse and display in table format:

```
AUDIT TRAIL — Last 25 events
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIME          SESSION    TOOL      INPUT_PREVIEW
12:34:05Z     abc123     Bash      npm test...
12:33:50Z     abc123     Edit      src/index.ts...
```

3. Highlight any BLOCKED events (exit code 2 from hooks)
4. Show summary: total events today, most-used tools, anomalies

## Gotchas

- Log file can be very large — use `tail -25` not full read
- JSONL lines may have malformed JSON from crashes — skip bad lines
- If log.jsonl doesn't exist, say "No audit log found" — don't error
- Timestamps are UTC — mention this in output
