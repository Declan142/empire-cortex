---
name: memory-sync
description: "Sync and materialize per-agent progress files into a unified view. Use when checking cross-agent state, before major operations, or when agents seem out of sync."
---

# /memory-sync — Cross-Agent Memory Sync

Materialize the shared Empire memory state.

## Steps

1. Read all per-agent state files in `.empire/progress/` (or `.claude/artifacts/progress.json` if not yet split)
2. Merge into a unified view
3. Report any conflicts or stale state (files older than 24h)
4. Show summary of each agent's last known activity

## Output

```
MEMORY SYNC — {timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━
Agent         Last Active      Status
scout         2h ago           idle
builder       15m ago          working on task-009
codex-vps     6h ago           last push: fix auth
openclaw      1d ago           stale ⚠️

Conflicts: none
Stale agents: openclaw (>24h)
```

## Future: Per-Agent Files

When migrated to per-agent state:
```
.empire/progress/
  scout-local.json      ← only Scout writes
  builder-local.json    ← only Builder writes
  codex-vps.json        ← only Codex writes
  openclaw.json         ← only OC writes
```

## Gotchas

- `_materialized.json` is gitignored — never commit it
- If `progress/` dir doesn't exist, fall back to single progress.json
- Stale state should be flagged but NOT deleted — agent may just be offline
- VPS agent state may be behind by one git pull cycle (~30s)
