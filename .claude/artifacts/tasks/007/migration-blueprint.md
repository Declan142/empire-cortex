# Empire V5 Migration Blueprint — Native Memory Architecture

**Task:** 007
**Date:** 2026-03-19
**Approach:** Evolve in-place, not rewrite

---

## Phase 1: CLAUDE.md Refactor (Do First)

Current CLAUDE.md is the constitution. Keep it, but slim it down.

### Before (current)
```
CLAUDE.md — everything in one file (~80 lines, will grow)
```

### After
```
CLAUDE.md              — identity + 5 core rules (< 50 lines)
.claude/rules/
├── agents.md          — agent hierarchy, model assignments
├── git-workflow.md    — branching, commits, PRs
├── artifacts.md       — file structure, ownership rules
├── communication.md   — CodeAgents format, token discipline
└── cost-guardrails.md — budget limits per agent tier
```

CLAUDE.md imports via @:
```markdown
# EMPIRE CONSTITUTION
## Identity
This is the Empire command center. GitHub is single source of truth.

## Rules
@.claude/rules/agents.md
@.claude/rules/git-workflow.md
@.claude/rules/artifacts.md
@.claude/rules/communication.md
@.claude/rules/cost-guardrails.md
```

---

## Phase 2: Agent Memory (Native Subagent Memory)

Add `memory: project` to each agent definition:

```yaml
# .claude/agents/scout.md
---
memory: project
model: sonnet
---
```

This creates:
```
.claude/agent-memory/
├── scout/MEMORY.md
├── builder/MEMORY.md
├── critic/MEMORY.md
└── guardian/MEMORY.md
```

Each agent auto-loads its own 200-line MEMORY.md. Committed to VCS.

**Replaces:**
- `artifacts/tasks/{id}/research.md` (Scout writes to its own memory)
- `artifacts/tasks/{id}/review.md` (Critic writes to its own memory)
- Custom residuals system
- Manual progress.json management (partially)

**Keep:**
- `progress.json` as the cross-agent state file (all agents read it)
- `audit/log.jsonl` as immutable audit trail

---

## Phase 3: Hooks Upgrade

### Add SessionStart hook
```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup",
      "command": "cat .claude/artifacts/progress.json",
      "output": "additionalContext"
    }]
  }
}
```

### Keep existing hooks
- PreCompact → save state (already exists)
- Stop → persist progress (already exists)

### Remove
- sync-residuals.sh (replaced by native agent memory)
- Manual bridge file writes

---

## Phase 4: Skills Conversion

Convert slash commands to folder-based skills with Gotchas:

```
.claude/skills/
├── interview/
│   ├── SKILL.md        — description, trigger, instructions
│   └── gotchas.md      — common failures
├── deploy/
│   ├── SKILL.md
│   ├── checklist.md
│   └── gotchas.md
└── tweet-nuke/
    ├── SKILL.md
    ├── twitter_nuke_browser.py
    └── gotchas.md
```

Skill description = trigger condition:
```yaml
---
description: "Use when building a large feature and need to gather requirements"
---
```

---

## Phase 5: OC↔CC Bridge (Post-Linux)

### Option A: Shared Memory Directory
Both CC and OC read/write to `~/.shared-memory/`:
```
~/.shared-memory/
├── cc-state.md      — Claude Code writes here
├── oc-state.md      — OpenClaw writes here
└── shared-context.md — both read
```

### Option B: MCP Memory Server
Use claude-mem or memsearch as shared MCP:
- Both CC and OC connect to same MCP server
- Semantic search across all context
- Auto-capture + vector search

### Option C: File Watcher
Simple daemon watches memory files, syncs bidirectionally.

**Decision:** Evaluate after Linux is stable. Option A is simplest.

---

## What Gets Removed

| Old System | Replacement |
|-----------|-------------|
| Custom residuals.jsonl per task | Agent-level MEMORY.md |
| sync-residuals.sh hook | Native agent memory |
| Manual progress.json reads | SessionStart hook injection |
| 80-line monolithic CLAUDE.md | Modular rules/ + imports |
| Bridge file (residuals-bridge.md) | Shared memory dir or MCP |

## What Stays

| Component | Why |
|-----------|-----|
| progress.json | Cross-agent state (all agents need it) |
| audit/log.jsonl | Immutable trail, append-only |
| Git workflow (branches, PRs) | Core discipline |
| Agent hierarchy | Lead→Scout→Builder→Critic still valid |
| CodeAgents format | Token efficiency still matters |

---

## Implementation Order

1. ✏️ Refactor CLAUDE.md → rules/ (can do now on Windows)
2. ✏️ Add `memory: project` to agent definitions (can do now)
3. 🐧 Add SessionStart hook (test on Linux)
4. 🐧 Convert skills to folder-based (test on Linux)
5. 🐧 Wire OC↔CC shared memory (after Linux stable)
6. 🐧 Remove old bridge/residuals code (after verification)

Items 1-2 can be done NOW. Items 3-6 are Linux-only.
