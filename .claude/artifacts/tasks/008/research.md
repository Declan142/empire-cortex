# Task 008 — Universal Memory Architecture for Multi-Agent AI Fleet

**Date:** 2026-03-19
**Scouts:** 5x Opus
**Status:** Complete
**Priority:** TOP — Foundation for entire Empire system

---

## Executive Summary

Build a **git-native, file-based, event-sourced memory system** that any AI agent can read/write — Claude Code, OpenClaw, Codex, local LLMs, and future models. No vendor lock-in. No databases required (sqlite-vec optional for semantic search).

**Core principles:**
1. Git is source of truth (versioning, rollback, sync)
2. Per-agent files (no shared mutable state = no merge conflicts)
3. Append-only logs for coordination (JSONL)
4. Markdown for knowledge (human + AI readable)
5. AGENTS.md as universal instruction format (Linux Foundation standard)

---

## Architecture: 3-Tier Git-Native Memory

```
TIER 1: WORKING MEMORY (in-context, <2K tokens per session)
├── .empire/progress/{agent}-{machine}.json  ← per-agent state (no conflicts)
├── .empire/events/{agent}-{date}.jsonl      ← append-only coordination log
└── AGENTS.md + CLAUDE.md                    ← instructions (always loaded)

TIER 2: KNOWLEDGE MEMORY (on-disk, searchable)
├── .empire/knowledge/*.md                   ← facts, decisions, learnings
├── .claude/agent-memory/{name}/MEMORY.md    ← per-agent persistent memory (native CC)
├── sqlite-vec index (optional)              ← semantic search over markdown
└── Compaction cron                          ← weekly summarize + deduplicate

TIER 3: ARCHIVAL (cold, git history)
├── Git commit history                       ← full versioning, rollback = git revert
├── .claude/artifacts/audit/log.jsonl        ← immutable append-only audit trail
└── Old event logs                           ← rotated, compressed
```

---

## Key Decision: Split progress.json

**Current:** Single `progress.json` — merge conflict bomb when multiple agents write.

**New:** Per-agent state files + materialized view:

```
.empire/progress/
├── scout-local.json        ← only Scout writes
├── builder-local.json      ← only Builder writes
├── codex-vps.json          ← only Codex (VPS) writes
├── openclaw.json           ← only OpenClaw writes
├── local-llm.json          ← only local LLM writes
└── _view.json              ← computed merge (gitignored, read-only)
```

**Why:** Different agents modify different files → git auto-merges → zero conflicts.

---

## Universal Instruction Format: AGENTS.md

**AGENTS.md is the emerging Linux Foundation standard** (60K+ repos, 20+ platforms).

```
AGENTS.md (universal — everyone reads)
    ↓ sync tool generates vendor-specific files
├── CLAUDE.md           (Claude Code — @imports, rules/)
├── Modelfile SYSTEM    (Ollama/local LLM)
├── SOUL.md             (OpenClaw)
├── .cursor/rules/      (Cursor)
└── .github/copilot-instructions.md (Copilot)
```

**Sync tool:** `block/ai-rules` (by Square, Rust) — write once, generate all formats.

**Token efficiency:** Markdown is 34-38% cheaper than JSON. YAML +6% over markdown. Best format = Markdown body + YAML frontmatter.

---

## How Each Agent Participates

### Claude Code (Local)
- Reads: CLAUDE.md → .claude/rules/ → progress/{self}.json → agent-memory/
- Writes: agent-memory/{name}/MEMORY.md, progress/cc-local.json, events/cc-{date}.jsonl
- Native: auto memory, session memory, subagent memory (memory: project)
- Sync: git commit + push

### OpenClaw (Local)
- Reads: SOUL.md, MEMORY.md, progress/{self}.json, .empire/knowledge/
- Writes: progress/openclaw.json, events/oc-{date}.jsonl
- Sync: git commit + push (or shared filesystem)

### Codex (VPS)
- Reads: AGENTS.md, .claude/rules/, progress/{self}.json
- Writes: progress/codex-vps.json, events/codex-{date}.jsonl
- Sync: git pull (cron 30s) → work → git push
- Trigger: GitHub webhook on push from local agents

### Local LLM (Ollama)
- Reads: AGENTS.md (via Modelfile SYSTEM), progress/{self}.json
- Writes: progress/local-llm.json, events/llm-{date}.jsonl
- Stack: Ollama + smolagents (~100 lines Python) + MCP bridge
- Context: 8K model = rules + progress only; 32K = full rules + artifacts
- Start as: READ-ONLY Scout role. Guardian validates before merge.

### Future Models
- Read AGENTS.md (any LLM can parse markdown)
- Write to own progress/{name}.json
- Append to own events/{name}-{date}.jsonl
- Follow .claude/rules/ (pure markdown, no vendor features)

---

## Cross-Machine Sync Protocol

**Git is the transport layer, not the coordination layer.**

```
Phase 1 (now):     git pull cron (30s) + watch .git/FETCH_HEAD
Phase 2 (Linux):   GitHub webhook receiver on VPS (~50 lines HTTP server)
Phase 3 (later):   GitHub Actions triggers on push to specific branches
```

**No CRDTs needed.** Our agents make coarse file writes, not character edits. Event sourcing + per-agent files handles everything.

**JSONL appends are atomic** on POSIX (≤PIPE_BUF ~4KB per write). Git auto-merges appended lines from different machines.

---

## Memory Security

- **Agent isolation:** Each agent writes only to its own files
- **Write-ahead validation:** Hooks validate memory mutations before persist
- **Append-only audit:** All writes logged to immutable audit/log.jsonl
- **Guardian monitoring:** Anomaly detection on write patterns
- **Git rollback:** Bad memory = git revert. Full history preserved.
- **Threat:** MINJA attack has 95% success on long-term memory. Defense: Guardian + human review.

---

## Memory Garbage Collection

| Strategy | When | How |
|----------|------|-----|
| Compaction | Weekly cron | Summarize old conversations → fact extraction |
| Deduplication | With compaction | Merge related facts, remove duplicates |
| Rotation | Monthly | Archive old event logs, keep last 30 days active |
| MEMORY.md pruning | On session start | Claude auto-prunes to 200 lines (native) |

---

## Token Budget Per Session

```
progress/{self}.json:   ~200 tokens
AGENTS.md/CLAUDE.md:    ~500 tokens (with rules/)
Semantic search result: ~500 tokens (on-demand)
Agent persona:          ~200 tokens
─────────────────────────────────────
TOTAL:                  ~1,400 tokens/session
Cost at Sonnet:         $0.004/session
100 sessions/day:       $0.40/day
```

---

## Key Projects to Study

| Project | What | Why It Matters |
|---------|------|---------------|
| [Beads](https://yuv.ai/blog/beads) | JSONL + SQLite cache, hash-based IDs | Best conflict-free pattern |
| [LedgerSync](https://github.com/Metacog-AI/ledgersync) | Append-only ledger for agent coordination | Closest to our needs |
| [DiffMem](https://github.com/Growth-Kinetics/DiffMem) | Git history IS the memory | Validates our approach |
| [block/ai-rules](https://github.com/block/ai-rules) | One source → all vendor configs | Solves AGENTS.md sync |
| [smolagents](https://huggingface.co/docs/smolagents) | ~100 line agent wrapper | Local LLM integration |
| [ollama-mcp-bridge](https://github.com/patruff/ollama-mcp-bridge) | MCP for Ollama | Same tools as CC |
| [sqlite-vec](https://github.com/asg017/sqlite-vec) | Vector search in SQLite | Semantic search, no server |
| [Letta/MemGPT](https://github.com/letta-ai/letta) | 3-tier memory hierarchy | Architecture reference |

---

## Academic Validation

1. **UCSD (March 2026):** 3-layer memory hierarchy (I/O → Cache → Memory) for multi-agent systems
2. **AgentGit (Nov 2025):** Git-like commit/revert/branch for agent state management
3. **Git Context Controller (May 2025):** 13% improvement on SWE-Bench with git-based context
4. **Lore (March 2026):** Git commit trailers as structured knowledge protocol
5. **Letta Benchmark:** Filesystem (grep + search_files on Markdown) scored 74.0% on LoCoMo, beating Mem0 graph at 68.5%

**Key insight:** Plain files with good search beat specialized vector DBs for agents already trained on filesystem operations.

---

## Implementation Phases

### Phase 0: Now (Windows) ✅ DONE
- [x] CLAUDE.md refactored to modular rules/
- [x] All agents have memory: project
- [x] OpenClaw SOUL.md + MEMORY.md updated for V5

### Phase 1: Linux Migration
- [ ] Create .empire/ directory structure
- [ ] Split progress.json into per-agent files
- [ ] Add AGENTS.md as universal instruction file
- [ ] Set up block/ai-rules for multi-format sync
- [ ] Create Ollama Modelfile with Empire rules

### Phase 2: Cross-Machine Sync
- [ ] Git pull cron (30s) on VPS
- [ ] GitHub webhook receiver on VPS
- [ ] Codex end-of-day sync script
- [ ] File watcher for local state changes

### Phase 3: Semantic Search
- [ ] Add sqlite-vec index over .empire/knowledge/
- [ ] Agent fact extraction → knowledge/ commits
- [ ] Weekly compaction cron

### Phase 4: Local LLM
- [ ] smolagents wrapper (~100 lines Python)
- [ ] Ollama MCP bridge setup
- [ ] Start as read-only Scout
- [ ] Guardian validation before merge

---

## Sources

### Git-Based Memory
- [Beads: Git-Backed Memory](https://yuv.ai/blog/beads)
- [LedgerSync](https://github.com/Metacog-AI/ledgersync)
- [DiffMem](https://github.com/Growth-Kinetics/DiffMem)
- [Letta Context Repositories](https://www.letta.com/blog/context-repositories)
- [MCP Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail)

### Universal Formats
- [AGENTS.md Official](https://agents.md/)
- [Linux Foundation AAIF](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- [GitHub: How to write AGENTS.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [block/ai-rules](https://github.com/block/ai-rules)
- [ai-rulez](https://github.com/Goldziher/ai-rulez)

### Local LLM Integration
- [Ollama MCP Bridge](https://github.com/patruff/ollama-mcp-bridge)
- [smolagents + Ollama](https://medium.com/@abonia/building-practical-local-ai-agents-with-smolagents-ollama-f92900c51897)
- [Hindsight + Ollama](https://hindsight.vectorize.io/blog/2026/03/10/run-hindsight-with-ollama)

### Sync Protocols
- [Event-Driven Multi-Agent Systems (Confluent)](https://www.confluent.io/blog/event-driven-multi-agent-systems/)
- [GitHub Agentic Workflows](https://github.blog/ai-and-ml/automate-repository-tasks-with-github-agentic-workflows/)
- [Clash: Worktree Conflict Detection](https://github.com/clash-sh/clash)

### Production Architectures
- [Letta Benchmark: Filesystem vs Memory DBs](https://www.letta.com/blog/benchmarking-ai-agent-memory)
- [Anthropic: Context Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Multi-Agent Memory Architecture (UCSD)](https://arxiv.org/html/2603.10062)
- [MINJA Memory Injection Attack](https://mem0.ai/blog/ai-memory-security-best-practices)

### Thariq (Anthropic)
- [Prompt Caching Is Everything](https://x.com/trq212/status/2024638793719177291)
- [How We Use Skills](https://x.com/trq212/status/2033949937936085378)
- [Seeing Like an Agent](https://x.com/trq212/status/2027463795355095314)
