# Task 003: OpenClaw Deep Research — Installation + Empire Integration + Memory

## What OpenClaw Actually Is

**NOT a Claude Code fork.** It's a "Life OS" messaging gateway — 315K stars, 500K LOC TypeScript monorepo.
- Single Node.js process (port 18789) routes 40+ messaging platforms to AI
- Built-in web UI (Lit components), CLI, Docker support
- SOUL.md persona system, AGENTS.md boot sequence
- 13K+ community skills marketplace
- Multi-agent support with per-agent workspaces
- ACP bridge connects IDEs (VS Code, Cursor) to the gateway

## Security Warning

**CVE-2026-25253 — CVSS 8.8 (Critical)**
- 1-click RCE via WebSocket token hijack
- 135K+ exposed instances, 50K+ vulnerable
- Patched in v2026.1.29+ (Jan 30 2026)
- **Must pin to latest version if installing**

## OpenClaw Memory System (The Problem)

### What It Does
- SQLite + sqlite-vec per agent at `~/.openclaw/memory/<agentId>.sqlite`
- ~400 token chunks, 80-token overlap, hybrid search (70% vector + 30% BM25)
- Embedding: local Gemma-300M (~600MB), OpenAI, Gemini, Voyage, Mistral, Ollama
- Two tools: `memory_search` (semantic) + `memory_get` (file read)
- Auto-flush before compaction (silent agentic turn)

### The 10 Confirmed Gaps
1. **Relationship blindness** — no graph, just flat chunks
2. **Cross-project contamination** — no namespace isolation by default
3. **Compaction loss** — flush triggers too late (20K reserve too tight)
4. **No multi-agent memory sharing** — isolated SQLite per agent
5. **Provider lock-in** — changing embedding model = full reindex
6. **Session staleness** — indexing only at 100KB/50 messages delta
7. **Storage bloat** — ~500MB/year, no retention policy
8. **No fuzzy search** — BM25 FTS5 has no typo tolerance
9. **Session memory conflicts** — voice messages break with experimental flag
10. **Mem0 plugin global scope** — can't scope to single agent in multi-agent

### How To Fix It (Tiered Architecture)
```
Tier 1: Keep native SQLite (fast hot-path, set reserveTokensFloor=40000)
Tier 2: Add Mem0 plugin (Qdrant + Ollama, per-agent userId scoping)
Tier 3: Add Cognee (knowledge graph for cross-project entity relationships)
Tier 4: memclawz fleet memory (when agent count grows)
```

### SOUL.md Best Practices
- 50-150 lines max (every line costs tokens every session)
- Structure: SOUL.md (identity) → AGENTS.md (rules) → USER.md (context) → MEMORY.md (<100 lines)
- Bake retrieval protocol into AGENTS.md: always `memory_search` before non-trivial tasks
- Add flush awareness: write decisions before `/compact`

## OpenClaw vs NanoClaw vs Claude Code

### What OpenClaw Has That We Don't
- 40+ messaging platforms (we have Telegram only)
- Built-in web UI (we have none)
- SOUL.md persona system
- 13K+ skills marketplace
- Multi-model support (Claude, GPT-4, Llama, Gemini)

### What We Have That OpenClaw Doesn't
- Container isolation per message (stronger than OpenClaw's per-session sandbox)
- Scout→Builder→Critic pipeline
- Token governance (ACON, budget %, Guardian)
- Append-only audit trail
- File checkpointing + session forking (Agent SDK)
- 24+ lifecycle hooks (PreToolUse, PostToolUse, etc.)

### What Claude Code Has That OpenClaw Doesn't
- File checkpointing — rewind filesystem to any prompt
- Session forking — branch conversations
- Git worktree isolation per subagent
- 24+ lifecycle hooks
- Sandboxing (filesystem + network)
- MCP ecosystem (100s of servers, OAuth, dynamic tool search)
- OpenTelemetry metrics export
- Extended thinking / effort levels
- Remote Control, /teleport, Chrome extension
- Plugin system for distributing agents + MCP + commands

## Co-Existence Architecture

### Port Map (NO conflicts)
| Port | Service | Status |
|------|---------|--------|
| 18789 | OpenClaw Gateway | Available |
| 3001 | NanoClaw | Running |
| 3000 | Langfuse | Running |
| 5432 | PostgreSQL (Mem0) | To add |
| 6333 | Qdrant (Mem0) | To add |

### RAM on 32GB
| Service | RAM |
|---------|-----|
| NanoClaw | ~200MB idle |
| OpenClaw Gateway | ~300MB base |
| Langfuse stack | ~600MB |
| Mem0 stack | ~1.5GB |
| **Total** | **~2.6GB** (28GB headroom) |

### Telegram Bot
Cannot share same token between OpenClaw and NanoClaw. Need separate bot if both run.

## Dashboard Tech Stack (for Empire web UI)
- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui + Tailwind CSS v4, dark theme
- **Drag-and-drop:** @hello-pangea/dnd (best for Kanban, React 19 compatible)
- **Animations:** Framer Motion (layout + presence only)
- **Real-time:** SSE via Node.js WSL bridge for Docker events
- **State:** Zustand
- **Charts:** Recharts (health sparklines)

### Reference repos
- `Qualiora/shadboard` — Next.js 15 + shadcn admin with kanban
- `Georgegriff/react-dnd-kit-tailwind-shadcn-ui` — DnD + shadcn reference
- `actionagentai/openclaw-dashboard` — agent dashboard patterns
- `abhi1693/openclaw-mission-control` — Kanban + agent lifecycle

## The Decision

### Option A: Install OpenClaw alongside NanoClaw (user's request)
- Install via Docker in WSL
- Create separate Telegram bot for OpenClaw
- Use OpenClaw for its web UI + additional channels
- Keep NanoClaw for task execution (container isolation)
- Wire Mem0 into both

### Option B: Borrow patterns only (research recommendation)
- Don't install OpenClaw
- Build dashboard ourselves (Next.js)
- Add Mem0 to NanoClaw
- Implement SOUL.md-style persona in NanoClaw's CLAUDE.md
- Add WhatsApp directly to NanoClaw (Baileys protocol)

### Recommended: Option A (modified)
Install OpenClaw for its **web UI and channel breadth**, but use NanoClaw for **task execution**:
- OpenClaw = messaging gateway + web chat + channel management
- NanoClaw = agent execution engine (Docker containers, Scout→Builder→Critic)
- Mem0 = shared memory layer (both systems write/read)
- Empire Dashboard = custom Kanban task board (Next.js)
