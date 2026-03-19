# Task 007 — Memory & Cross-Session Architecture Research

**Date:** 2026-03-19
**Scout:** sonnet-4-6
**Status:** Complete

## Sources

### Thariq Shihipar (@trq212) — Claude Code Team, Anthropic

1. [Claude Code is All You Need](https://x.com/trq212/status/1944877527044120655)
2. [Prompt Caching Is Everything](https://x.com/trq212/status/2024638793719177291)
3. [Seeing Like an Agent](https://x.com/trq212/status/2027463795355095314)
4. [How We Use Skills](https://x.com/trq212/status/2033949937936085378)
5. [Spec-Based Development](https://x.com/trq212/status/2005315275026260309)
6. [Auto-Memory Rollout](https://x.com/trq212/status/2027109375765356723)
7. [Tool Search Rollout](https://x.com/trq212/status/2011523628773622234)
8. [Opus 4.6 1M in Max](https://x.com/trq212/status/2032518422580572541)

### Official Docs
- [Memory Docs](https://code.claude.com/docs/en/memory)
- [Subagent Memory](https://code.claude.com/docs/en/sub-agents#enable-persistent-memory)
- [Hooks](https://code.claude.com/docs/en/hooks)
- [Best Practices](https://code.claude.com/docs/en/best-practices)
- [Session Memory](https://claudefa.st/blog/guide/mechanics/session-memory)

### Community Tools
- [Cortex](https://github.com/hjertefolger/cortex) — SQLite + vector, survives /clear
- [Claude-Mem](https://github.com/thedotmack/claude-mem) — auto-capture + Chroma
- [Memsearch](https://milvus.io/blog/adding-persistent-memory-to-claude-code-with-the-lightweight-memsearch-plugin.md)

---

## Findings

### 1. Claude Code Native Memory — 3 Layers

| Layer | Who Writes | Loaded | Limit |
|-------|-----------|--------|-------|
| CLAUDE.md | User | Full, every session | < 200 lines recommended |
| Auto Memory (MEMORY.md) | Claude | First 200 lines at start | Hard 200-line cap |
| Session Memory | Claude (auto) | Relevant past summaries injected | Feature-flagged |

### 2. Subagent Memory (v2.1.33+)

```yaml
# In agent frontmatter
memory: project  # or user | local
```

Creates `.claude/agent-memory/<agent-name>/` with:
- Auto-loaded MEMORY.md (200 lines)
- Read/Write/Edit auto-enabled for that directory
- `project` scope = commits to VCS, shared across team

### 3. Hook-Based Memory Pattern

```
SessionStart  → inject progress.json as additionalContext
PostToolUse   → sync writes when memory files change
SessionEnd    → persist state to external store
```

### 4. Thariq's 7 Prompt Caching Rules

1. Layer content: static system prompt + tools (cached) → CLAUDE.md (project-cached) → session → conversation
2. Never modify system prompt mid-session
3. Never switch models mid-conversation — use subagents
4. Never add/remove tools mid-conversation
5. Keep all tools present; use system messages to steer
6. Use `defer_loading: true` stubs + ToolSearch
7. For compaction/forking: identical system prompts = cache reuse

### 5. Thariq's Skills Lessons

- **Gotchas section** = highest-signal content in any skill
- Skills are folders (scripts, assets, data) not just markdown
- Use file system for progressive disclosure
- Give skills their own memory (logs, JSON in skill dir)
- Skill description = trigger condition, not a summary
- 9 categories: Library/API Refs, Product Verification, Data Fetching, Business Automation, Code Scaffolding, Code Quality, CI/CD, Runbooks, Infra Ops

### 6. Thariq's Spec-Based Workflow

1. Start with minimal spec (even 1 sentence)
2. Ask Claude to interview you via AskUserQuestionTool
3. Deep non-obvious questions about impl, UX, tradeoffs
4. Write spec to file
5. Fresh session to execute

### 7. Current Empire State (Audit)

| Component | Status |
|-----------|--------|
| CC→OC bridge file | Exists, last sync MANUAL, hook never fired |
| OC→CC parser | Code exists, dashboard not running |
| OpenClaw gateway | NOT running, zero channel tokens |
| Models | OC: sonnet-4-5, CC: sonnet-4-6 (mismatch) |
| Hooks | Depend on jq, probably missing on Windows |
| Memory | CC and OC completely isolated |

---

## Recommendations

### For Linux Migration

1. **Add `memory: project` to Scout, Builder, Critic, Guardian agents**
   - Each gets `.claude/agent-memory/<name>/` that persists and commits to VCS
   - Replaces custom residuals system entirely

2. **Add SessionStart hook**
   - Inject progress.json as additionalContext
   - Zero-overhead session continuity

3. **Trim CLAUDE.md to < 200 lines**
   - Move agent hierarchy details to `.claude/rules/agents.md`
   - Move git workflow to `.claude/rules/git.md`
   - Move file structure to `.claude/rules/structure.md`

4. **Trust native auto memory**
   - Stop manual MEMORY.md management
   - Let Claude curate its own topic files
   - Use `/remember` to promote patterns to CLAUDE.local.md

5. **Skills with Gotchas**
   - Convert existing slash commands to folder-based skills
   - Add Gotchas section to each from real failure patterns

6. **OC↔CC sync**
   - Evaluate claude-mem or memsearch MCP for shared memory
   - Or use shared file-based memory directory both can access

7. **Model alignment**
   - Pin both OC and CC to same model version
   - Use subagents for model-switching (Thariq rule #3)
