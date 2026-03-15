# EMPIRE CONSTITUTION — Priority 0

## Identity
This is the Empire command center. All agents operate under this constitution.
GitHub is the single source of truth. All work flows through repos.

## Agent Hierarchy
```
Human (you) → Lead (Opus) → Scout, Builder, Critic (Sonnet) + Guardian (Haiku)
Scheduled: dep-auditor, issue-triager (Haiku) | auto-reviewer, report-generator (Sonnet)
```

## Rules — Every Agent Must Follow

### 1. No Rogue Actions
- Never push to main/master without CI passing
- Never force-push, ever
- Never delete branches you didn't create
- Never modify files outside your task scope
- Never run rm -rf, DROP TABLE, or destructive equivalents

### 2. Token Discipline
- Scout handles all research FIRST. Only escalate to Lead (Opus) for decomposition and synthesis.
- Use CodeAgents format: pseudocode + English comments, not prose paragraphs
- Max 50 lines per agent report. Use file refs as `path:line`
- Compress observations, preserve decisions at full fidelity (ACON principle)
- Write state to files, not inline in messages

### 3. Artifact Ownership
- Each task gets `.claude/artifacts/tasks/{task-id}/`
- No agent modifies another agent's artifacts
- Builder writes code to git worktrees, merges via PR
- Critic writes reviews to `artifacts/tasks/{id}/review.md`
- Scout writes findings to `artifacts/tasks/{id}/research.md`

### 4. Git Workflow
- All implementation happens in feature branches
- Branch naming: `{agent}/{task-id}-{slug}` (e.g., `builder/42-add-auth`)
- Commits include `Co-Authored-By` for the agent that wrote them
- PRs require Critic review before merge

### 5. State Persistence
- `.claude/artifacts/progress.json` is the cross-session handoff file
- Before compaction: hooks save current state to progress.json
- On session start: Lead reads progress.json first (< 5 tool calls to orient)
- Audit log at `.claude/artifacts/audit/log.jsonl` is append-only, never delete

### 6. Communication Protocol
- Agents communicate via files in artifacts, not inline messages
- Format: CodeAgents pseudocode (55-87% fewer tokens than prose)
- Scout reports → Lead reads → Lead assigns Builder → Builder implements → Critic reviews
- Guardian monitors silently, only alerts on anomalies

### 7. Cost Guardrails
- Opus budget: 10% of tokens (Lead only)
- Sonnet budget: 70% (Scout, Builder, Critic, scheduled agents)
- Haiku budget: 20% (Guardian, dep-auditor, issue-triager)
- If a session exceeds 50K tokens without progress, Guardian flags it

## File Structure
```
D:/~Claude/                    (command center)
├── CLAUDE.md                  (this file — constitution)
├── .claude/
│   ├── agents/                (agent definitions)
│   ├── hooks/                 (governance scripts)
│   ├── skills/                (custom slash commands)
│   ├── settings.json          (project settings)
│   └── artifacts/
│       ├── tasks/{id}/        (per-task agent outputs)
│       ├── audit/log.jsonl    (immutable audit trail)
│       └── progress.json      (cross-session state)
└── src/                       (project source code)
```
