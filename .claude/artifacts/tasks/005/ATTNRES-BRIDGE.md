# Agent Attention Residuals — Complete Documentation

## Overview

AgentAttnRes adapts Kimi/Moonshot AI's Attention Residuals architecture (March 2026) to multi-agent orchestration. Instead of fixed linear handoff between agents, each agent gets **attention-weighted context** from ALL prior agent outputs — including cross-system (Claude Code ↔ OpenClaw).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER MESSAGE                                  │
│                    ┌──────────┴──────────┐                           │
│                    ▼                     ▼                           │
│             ┌─────────────┐      ┌─────────────┐                    │
│             │  OPENCLAW    │      │ CLAUDE CODE  │                    │
│             │  Gateway     │      │  Terminal     │                    │
│             └──────┬──────┘      └──────┬──────┘                    │
│                    │                     │                           │
│         ┌──────────┴──┐         ┌───────┴─────────┐                 │
│         ▼             │         ▼                  │                 │
│  ┌──────────┐         │  ┌──────────┐              │                 │
│  │  Empire   │         │  │  Lead    │  (Opus)      │                 │
│  │  Agent    │         │  │  Agent   │              │                 │
│  └────┬─────┘         │  └────┬─────┘              │                 │
│       │               │       │                    │                 │
│       ▼               │       ├──► Scout (Sonnet)  │                 │
│  Read Bridge ◄────────┼───────┤                    │                 │
│  (residuals-          │       ├──► Builder (Sonnet) │                 │
│   bridge.md)          │       │                    │                 │
│       │               │       ├──► Critic (Sonnet)  │                 │
│       ▼               │       │                    │                 │
│  Memory Search        │       └──► Guardian (Haiku) │                 │
│  (hybrid vec+BM25)    │                            │                 │
│       │               │              │              │                 │
│       ▼               │              ▼              │                 │
│  Write [attnres]      │     Write residuals.jsonl   │                 │
│  to memory/{date}.md  │              │              │                 │
│       │               │              ▼              │                 │
│       │               │     Pre-compact hook        │                 │
│       │               │     ┌───────────────┐       │                 │
│       │               │     │ sync-residuals │       │                 │
│       │               │     │     .sh        │       │                 │
│       │               │     └───────┬───────┘       │                 │
│       │               │             │               │                 │
│       ▼               ◄─────────────┘               │                 │
│  OC reads CC          │  Writes bridge file          │                 │
│  residuals on         │  to ~/.openclaw/memory/      │                 │
│  next query           │  residuals-bridge.md         │                 │
│                       │                              │                 │
│             ┌─────────┴─────────┐                    │                 │
│             │   BRIDGE SYNC     │                    │                 │
│             │  CC → OC: hook    │                    │                 │
│             │  OC → CC: dash    │                    │                 │
│             └───────────────────┘                    │                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Formula

```
weight_raw[i] = roleAffinity × tagOverlap × recencyDecay
weights = softmax(weight_raw)
```

| Signal | Analog | Implementation |
|--------|--------|----------------|
| Role Affinity | Zero-init pseudo-query | 6×6 hand-tuned matrix (ROLE_AFFINITY) |
| Tag Overlap | Query·Key dot product | Jaccard similarity on controlled vocab |
| Recency Decay | Positional encoding | 0.95^steps × 0.7^phase_boundaries |
| Cross-system bonus | — | 1.5× for CC↔OC connections |

## File Structure

```
D:/~Claude/                              (Claude Code)
├── .claude/
│   ├── agents/
│   │   ├── scout.md                     ← AttnRes protocol added
│   │   ├── builder.md                   ← AttnRes protocol added
│   │   ├── critic.md                    ← AttnRes protocol added
│   │   └── guardian.md                  ← AttnRes protocol (read-only)
│   ├── hooks/
│   │   ├── pre-compact.sh              ← Promotes residuals + triggers sync
│   │   ├── post-tool.sh                ← Detects residual writes
│   │   └── sync-residuals.sh           ← CC→OC bridge writer
│   └── artifacts/
│       ├── tasks/{id}/residuals.jsonl   ← Per-task residual store
│       └── progress.json               ← Cross-session top residuals
│
├── dashboard/src/
│   ├── lib/
│   │   ├── types.ts                    ← AgentResidual, AttentionWeight types
│   │   ├── attn-residuals.ts           ← Computation module + demo data
│   │   ├── residual-bridge.ts          ← CC↔OC bridge module
│   │   └── store.ts                    ← Zustand store (AttnRes slice)
│   └── components/attention/
│       ├── attention-flow.tsx           ← SVG graph + view toggle
│       ├── residual-detail.tsx          ← Slide-out detail panel
│       └── message-flow.tsx            ← Animated dual-path flow diagram
│
C:/Users/adity/.openclaw/               (OpenClaw)
├── openclaw.json5                      ← Tuned config (40K reserve, hybrid mem)
├── agents/
│   ├── AGENTS.md                       ← Team-level: CC+OC roster, handoff rules
│   └── empire/
│       ├── SOUL.md                     ← AttnRes protocol for OC agent
│       └── MEMORY.md                   ← Persistent facts (100 lines)
└── memory/
    ├── residuals-bridge.md             ← Written by CC sync hook
    └── {YYYY-MM-DD}.md                ← Daily logs with [attnres] tags
```

## Message Flow

### Path A: User → OpenClaw

```
1. User sends message (Telegram/Discord/DM)
2. Gateway receives on port 18789
3. Empire agent loads: AGENTS.md → SOUL.md → MEMORY.md
4. Read ~/.openclaw/memory/residuals-bridge.md
   - weight > 0.3 → read fully (summary + decisions + risks)
   - weight 0.1-0.3 → summary only
   - weight < 0.1 → skip
5. memory_search("{topic}") — hybrid vector(0.7) + BM25(0.3)
6. Generate response with CC context + OC memory
7. Write finding to memory/{date}.md:
   [attnres] agent=empire task={id} confidence={h/m/l}
   summary: ...
   decisions: ...
   tags: ...
```

### Path B: User → Claude Code

```
1. User types in Claude Code terminal
2. Lead (Opus) reads constitution + progress.json
   - progress.json.attn_residuals.top_residuals[] from prior sessions
3. Lead decomposes task, assigns agents
4. Scout reads residuals.jsonl → computes attention weights
   - softmax(roleAffinity × tagOverlap × recencyDecay)
   - Prioritizes weight > 0.3, skips < 0.1
5. Scout researches, appends AgentResidual to residuals.jsonl
6. Builder reads Scout's residual (weighted), implements code
7. Critic cross-references Scout + Builder residuals
8. Guardian monitors silently (read-only)
9. Pre-compact hook triggers:
   a. Promote top-3 high-confidence → progress.json (cap 20)
   b. Run sync-residuals.sh → write residuals-bridge.md
10. Next OC query reads the bridge file
```

### Bridge Sync Protocol

| Direction | Trigger | Mechanism | File |
|-----------|---------|-----------|------|
| CC → OC | Pre-compact hook | sync-residuals.sh | ~/.openclaw/memory/residuals-bridge.md |
| OC → CC | Dashboard refresh | residual-bridge.ts parser | memory/{date}.md [attnres] entries |
| CC → CC | Session start | progress.json read | .claude/artifacts/progress.json |
| OC → OC | Every query | MEMORY.md + memory_search | ~/.openclaw/agents/empire/MEMORY.md |

## Controlled Tag Vocabulary (25 tags)

```
api-design, architecture, auth, config, data-model,
debugging, deployment, documentation, hooks, memory,
messaging, monitoring, performance, refactoring, security,
testing, ui, ux, dependency, migration,
openclaw, dashboard, mcp, agent-protocol, cost
```

## OpenClaw Config Highlights

| Key | Value | Why |
|-----|-------|-----|
| reserveTokensFloor | 40,000 | 3.3× default — keeps residuals in context |
| memoryFlush.softThresholdTokens | 5,000 | Triggers memory write before context loss |
| memorySearch.hybrid | vec:0.7 + text:0.3 | Best recall for structured [attnres] entries |
| memorySearch.mmr.lambda | 0.7 | Dedup diverse results |
| temporalDecay.halfLifeDays | 30 | Old residuals fade naturally |
| heartbeat.every | 30m | Periodic bridge check |
| sandbox.mode | non-main | Safe defaults |
| gateway.bind | loopback | Security: never expose to network |

## Dashboard Views

### Attention Graph (default)
- SVG canvas with animated bezier edges showing attention weights
- Nodes grouped by phase: Research → Implementation → Review
- Node colors: Opus (gold), Sonnet (violet), Haiku (green)
- Source rings: solid cyan (CC), dashed orange (OC)
- Click node → slide-out panel with full residual detail
- Traveling particles on edges proportional to weight

### Message Flow (toggle)
- Dual-column layout: OpenClaw path | Bridge | Claude Code path
- Click any step to expand execution details
- Bridge footer shows sync protocol for both directions
- System badges: YOU, OPENCLAW, BRIDGE, CLAUDE CODE

## AgentResidual Format (JSONL)

```json
{
  "id": "scout-2026-03-17T10:00:00Z",
  "taskId": "004",
  "agent": "scout",
  "phase": "research",
  "timestamp": "2026-03-17T10:00:00Z",
  "summary": "1-2 sentences",
  "keyFindings": ["max 5 items"],
  "artifacts": ["file paths"],
  "decisions": ["full fidelity — ACON principle"],
  "risks": ["if any"],
  "confidence": "high|medium|low",
  "tags": ["from controlled vocab"],
  "tokenCost": 12000
}
```

## Token Budget Impact

| Agent | Budget | AttnRes Overhead |
|-------|--------|------------------|
| Lead (Opus) | 10% | +~200 tokens reading progress.json residuals |
| Scout (Sonnet) | 70% shared | +~500 tokens reading/writing residuals.jsonl |
| Builder (Sonnet) | 70% shared | +~300 tokens reading weighted residuals |
| Critic (Sonnet) | 70% shared | +~400 tokens cross-referencing |
| Guardian (Haiku) | 20% | +~100 tokens monitoring residual store |
| Empire (OC Sonnet) | OC budget | +~300 tokens reading bridge file |

Total overhead: <2% of session tokens. Same accuracy, better context routing.
