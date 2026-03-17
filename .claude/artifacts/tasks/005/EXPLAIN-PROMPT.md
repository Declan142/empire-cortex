# Prompt — paste this into Claude (attach ATTNRES-BRIDGE.md as context)

---

I have a multi-agent system called "Empire" that uses a technique called **Agent Attention Residuals (AgentAttnRes)** — adapted from Kimi/Moonshot AI's Attention Residuals paper (March 2026) — to share weighted context between agents across TWO systems:

1. **Claude Code** (terminal-based, 5 agents: Lead/Opus, Scout/Sonnet, Builder/Sonnet, Critic/Sonnet, Guardian/Haiku)
2. **OpenClaw** (gateway-based, 1 agent: Empire/Sonnet — handles Telegram/Discord/DM)

They sync via a **bridge file** (`residuals-bridge.md`) — Claude Code writes it during pre-compact hooks, OpenClaw reads it on every query.

**Please create a detailed, step-by-step animated diagram (using an artifact with HTML/CSS/JS)** that shows:

### Scene 1: "User → OpenClaw" path
1. User sends a message (e.g., via Telegram)
2. OpenClaw gateway receives it (port 18789)
3. Empire agent loads: AGENTS.md → SOUL.md → MEMORY.md
4. Empire reads `residuals-bridge.md` — show weight filtering (>0.3 read fully, 0.1-0.3 summary, <0.1 skip)
5. Empire does `memory_search()` — hybrid vector(0.7) + BM25(0.3)
6. Empire responds + writes `[attnres]` entry to `memory/{date}.md`

### Scene 2: "User → Claude Code" path
1. User types in Claude Code terminal
2. Lead (Opus) reads `progress.json` → `attn_residuals.top_residuals[]`
3. Lead decomposes task, assigns Scout
4. Scout reads `residuals.jsonl`, computes attention weights: `softmax(roleAffinity × tagOverlap × recencyDecay)`
5. Scout researches, appends AgentResidual
6. Builder reads Scout's residual (attention-weighted), implements code
7. Critic cross-references Scout + Builder residuals
8. Guardian monitors silently (read-only)
9. Pre-compact hook: promote top-3 → progress.json + run `sync-residuals.sh` → writes bridge file

### Scene 3: "The Bridge" (show both directions simultaneously)
- **CC → OC**: Hook scans all `residuals.jsonl` → writes top-10 to `~/.openclaw/memory/residuals-bridge.md`
- **OC → CC**: Dashboard's `residual-bridge.ts` parses `[attnres]` entries from OpenClaw daily logs
- Cross-system connections get **1.5× attention weight bonus**
- Show particles flowing both directions

### Design requirements:
- Dark theme (slate-900 background), sci-fi aesthetic
- Color coding: Opus=gold (#f59e0b), Sonnet=violet (#8b5cf6), Haiku=emerald (#10b981)
- Source coding: Claude Code=cyan (#06b6d4), OpenClaw=orange (#f97316), Bridge=amber (#f59e0b)
- Animated bezier edges with traveling particles (like data packets)
- Nodes pulse when "active"
- Auto-play through scenes with a timeline scrubber
- Show the attention weight formula visually: `w = softmax(affinity × tags × decay)`
- Include the 25-tag controlled vocabulary as floating labels

The attached `ATTNRES-BRIDGE.md` has the complete architecture, file structure, config details, and message flow paths. Use it as the source of truth.

---
