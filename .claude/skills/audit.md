---
name: audit
description: Show the audit trail — recent tool calls, who did what, and any blocked operations.
user_invocable: true
---

# /audit — Audit Trail Viewer

Show recent audit log entries.

## Instructions
When the user runs `/audit`:

1. Read `.claude/artifacts/audit/log.jsonl`
2. Parse the last 25 entries
3. Display in a table format:

```
AUDIT TRAIL — Last 25 events
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIME          SESSION    TOOL      INPUT_PREVIEW
12:34:05Z     abc123     Bash      npm test...
12:33:50Z     abc123     Edit      src/index.ts...
12:33:42Z     abc123     Read      CLAUDE.md...
```

4. Highlight any BLOCKED events (from pre-tool hook)
5. Show summary: total events today, most-used tools, any anomalies
