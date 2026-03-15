# Task 002: OpenClaw + Empire Dashboard + Memory — Master Research

## The Big Revelation

**OpenClaw is NOT a code editor or Claude Code fork.** It's a "Life OS" — a messaging gateway connecting 50+ platforms (WhatsApp, Telegram, Slack, Discord, Signal, iMessage...) to AI agents. It has 247K+ GitHub stars, a built-in web UI, and its own memory system (SOUL.md + vector SQLite). **NanoClaw is already built on the same foundation** (Anthropic Agent SDK) but is 700x smaller and security-focused.

**We don't need to migrate.** We need to steal OpenClaw's best ideas and build them on our stack.

---

## What OpenClaw Has That We Don't (Yet)

| Feature | OpenClaw | Empire V3 (current) | Gap |
|---|---|---|---|
| Web UI | Built-in Control UI + WebChat | None | **HIGH** |
| 50+ messaging platforms | WhatsApp, Telegram, Signal, Discord, etc. | Telegram only | MEDIUM |
| Memory system (SOUL.md) | Per-agent identity + vector search SQLite | CLAUDE.md + progress.json | **HIGH** |
| Skills marketplace | 13,729+ community skills | 8 agent definitions | LOW |
| Multi-model support | Claude, GPT-4, Llama, Gemini | Claude only (Max) | LOW |
| Task management UI | None (CLI/chat only) | None | **HIGH** |

---

## What We Have That OpenClaw Doesn't

| Feature | Empire V3 | OpenClaw |
|---|---|---|
| Container isolation per task | Docker containers, OS-level | App-layer allowlists |
| Multi-agent pipeline | Scout→Builder→Critic | Partial (workspaces) |
| Audit trail | Append-only JSONL | Limited |
| Token governance | ACON, budget %, Guardian | None |
| Security | Clean | CVE-2026-25253 (8.8 CVSS, 1-click RCE) |

---

## The Plan: Empire V4 Upgrade

### Phase 1: Empire Web Dashboard (IMMEDIATE — next session)
**Stack:** Next.js 15 + shadcn/ui + @hello-pangea/dnd + Framer Motion + Zustand

**Pages:**
- `/dashboard` — Service status bar + Kanban task board (drag-and-drop)
- `/agents` — Agent status table (Scout/Builder/Critic/Guardian)
- `/logs` — Real-time NanoClaw journalctl stream

**Components:**
- `ServiceStatusBar` — live dots for NanoClaw, Docker, Langfuse, Telegram
- `KanbanBoard` — 3 columns: Todo / In Progress / Done
- `TaskCard` — draggable, animated, shows agent + priority
- `ContainerFeed` — Docker spawn/exit events in real-time
- `HealthSparkline` — 5-min rolling health history

**Data:** SSE from WSL Node.js bridge for Docker events + 5s polling for health

**Reference repos to fork/learn from:**
- `Qualiora/shadboard` — Next.js 15 + shadcn/ui admin with kanban
- `Georgegriff/react-dnd-kit-tailwind-shadcn-ui` — DnD + shadcn reference
- `actionagentai/openclaw-dashboard` — agent dashboard patterns

### Phase 2: Memory System (NEXT WEEK)
**Architecture: Layered Memory**
```
Layer 0: CLAUDE.md         — static rules (existing, keep)
Layer 1: progress.json     — enhanced with session summaries + completed_archive
Layer 2: decisions.md      — append-only architectural decisions log
Layer 3: Mem0 self-hosted  — Docker, Qdrant + Neo4j, semantic retrieval
Layer 4: JSON graph         — task/agent/outcome relationships
```

**Quick wins (zero new infra):**
1. Fix pre-compact.sh to save session summary before compaction
2. Fix audit log hook (tool + input_preview fields are empty)
3. Add decisions.md artifact
4. Add completed_archive to progress.json schema

**Mem0 deployment:**
- Docker Compose: mem0-server + PostgreSQL/pgvector + Neo4j
- MCP server: tensakulabs/mem0-mcp → agents call memory as a tool
- Each agent gets scoped memories: agent_id="scout", user_id="aditya"

### Phase 3: OpenClaw-Style Features (FUTURE)
- WhatsApp channel (NanoClaw already supports it)
- SOUL.md per-agent identity (inspired by OpenClaw's persona system)
- Scheduled agents on systemd timers
- Skills marketplace equivalent

---

## OpenClaw Security Warning

CVE-2026-25253 — CVSS 8.8 (Critical)
- 1-click RCE via auth token exfiltration + Cross-Site WebSocket Hijacking
- 135,000+ exposed instances, 50,000+ directly vulnerable
- DO NOT run OpenClaw repo directly — build features on NanoClaw/Agent SDK instead

---

## Decision

**DO NOT migrate to OpenClaw.** Build the missing features on our existing NanoClaw + Agent SDK foundation:
1. Web dashboard (Phase 1)
2. Memory system (Phase 2)
3. Additional channels + features (Phase 3)
