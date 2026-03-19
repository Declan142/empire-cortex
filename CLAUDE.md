# EMPIRE CONSTITUTION — Priority 0

## Identity
This is the Empire command center. All agents operate under this constitution.
GitHub is the single source of truth. All work flows through repos.

## State
- `progress.json` is the cross-session handoff — read it first (< 5 tool calls to orient)
- Each agent has persistent memory via `memory: project` in `.claude/agent-memory/<name>/`
- Audit log at `.claude/artifacts/audit/log.jsonl` is append-only, never delete

## Rules
@.claude/rules/safety.md
@.claude/rules/agents.md
@.claude/rules/git-workflow.md
@.claude/rules/artifacts.md
@.claude/rules/communication.md
