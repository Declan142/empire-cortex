# Artifact Ownership & Structure

```
.claude/
├── agents/                    (agent definitions with memory: project)
├── agent-memory/<name>/       (per-agent persistent memory — auto-managed)
├── hooks/                     (governance scripts)
├── skills/                    (folder-based skills with gotchas)
├── rules/                     (modular instruction files — this dir)
├── settings.json              (project settings)
└── artifacts/
    ├── tasks/{id}/            (per-task agent outputs)
    ├── audit/log.jsonl        (immutable audit trail — append-only, never delete)
    └── progress.json          (cross-session handoff — all agents read this)
```

## Ownership Rules
- Each task gets `.claude/artifacts/tasks/{task-id}/`
- No agent modifies another agent's artifacts
- Builder writes code to git worktrees, merges via PR
- Critic writes reviews to `artifacts/tasks/{id}/review.md`
- Scout writes findings to `artifacts/tasks/{id}/research.md`
- Agent memory is private to each agent — don't cross-read
