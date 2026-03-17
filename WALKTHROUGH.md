# Empire Cortex — Technical Walkthrough

> "No other production multi-agent system implements attention-weighted context routing between agents."

This is a complete technical walkthrough of Empire Cortex — a multi-agent command center running entirely on a single Windows 11 machine. It connects two AI runtimes across a file-based bridge, implements a novel attention mechanism adapted from transformer research, and governs every agent action through hooks, typed schemas, and a constitutional rule set baked into the root of the repository.

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [System Topology](#2-system-topology)
3. [The Constitution](#3-the-constitution)
4. [Agent Definitions](#4-agent-definitions)
5. [Agent Attention Residuals — First Principles](#5-agent-attention-residuals--first-principles)
6. [The Computation Engine](#6-the-computation-engine)
7. [The Residual Schema](#7-the-residual-schema)
8. [The CC↔OC Bridge](#8-the-ccoc-bridge)
9. [Governance Hooks](#9-governance-hooks)
10. [The Dashboard](#10-the-dashboard)
11. [Cross-Session State Persistence](#11-cross-session-state-persistence)
12. [Message Flow — End to End](#12-message-flow--end-to-end)
13. [Why This Architecture Works](#13-why-this-architecture-works)
14. [Running It](#14-running-it)
15. [What Comes Next](#15-what-comes-next)

---

## 1. What This Is

Empire Cortex is two AI runtimes connected by structured data.

**Runtime A — Claude Code** (`D:/~Claude`): A team of specialized agents running in Claude Code's terminal environment. Lead (Opus) orchestrates. Scout, Builder, and Critic (all Sonnet) handle research, implementation, and review. Guardian (Haiku) monitors silently. These agents share state through structured JSONL files — one per task — and communicate via artifacts, not inline messages.

**Runtime B — OpenClaw** (`D:/openclaw`): A gateway agent (Empire, Sonnet) running via the OpenClaw CLI. It handles real-time queries from Telegram and other messaging surfaces. It has its own hybrid memory system (vector + BM25). It is connected to Runtime A through a shared bridge file.

The bridge is the novel part. When Claude Code agents compact context, a pre-compact hook fires, collects all agent residuals across all tasks, sorts them by confidence, and writes a structured markdown file into OpenClaw's memory directory. OpenClaw reads this file on every technical query. When OpenClaw's Empire agent completes a task, it writes a structured `[attnres]` entry to its daily memory log. A dashboard parser on the Claude Code side reads those entries and unifies them into the same attention graph.

Neither system polls the other. Neither makes API calls to the other. The bridge is files. This is intentional.

---

## 2. System Topology

```
Windows 11 (no Docker, no WSL)
│
├── D:/~Claude/                          (Claude Code command center)
│   ├── CLAUDE.md                        (constitution — Priority 0)
│   ├── WALKTHROUGH.md                   (this file)
│   ├── ARCHITECTURE.md                  (physical architecture)
│   ├── .claude/
│   │   ├── agents/                      (6 agent definition files)
│   │   │   ├── scout.md
│   │   │   ├── builder.md
│   │   │   ├── critic.md
│   │   │   └── guardian.md
│   │   ├── hooks/
│   │   │   ├── pre-compact.sh           (state save + bridge trigger)
│   │   │   ├── post-tool.sh             (audit logger + residual detector)
│   │   │   └── sync-residuals.sh        (CC→OC bridge writer)
│   │   ├── settings.json                (hook registration)
│   │   └── artifacts/
│   │       ├── tasks/
│   │       │   └── {id}/
│   │       │       └── residuals.jsonl  (per-task agent outputs)
│   │       ├── audit/log.jsonl          (immutable append-only log)
│   │       └── progress.json            (cross-session handoff)
│   └── dashboard/                       (Next.js 16 sci-fi UI)
│       └── src/
│           ├── lib/
│           │   ├── types.ts
│           │   ├── attn-residuals.ts
│           │   ├── residual-bridge.ts
│           │   └── store.ts
│           └── components/attention/
│               ├── attention-flow.tsx
│               ├── message-flow.tsx
│               └── residual-detail.tsx
│
├── D:/openclaw/                         (OpenClaw gateway)
│   ├── openclaw.json
│   └── workspace-main/
│       └── SOUL.md                      (Empire agent identity + AttnRes protocol)
│
└── C:/Users/adity/.openclaw/
    ├── workspace/memory/
    │   └── residuals-bridge.md          (CC→OC bridge file — top 10 residuals)
    └── memory/
        └── residuals-bridge.md          (mirror)
```

The `.mcp.json` at the root registers the OpenClaw MCP server, letting Claude Code agents call OpenClaw tools directly if needed.

---

## 3. The Constitution

`CLAUDE.md` is Priority 0. Every agent reads it at session start — it is not a style guide, it is the operating contract.

Seven rules govern every agent without exception:

**1. No Rogue Actions.** Never push to main without CI passing. Never force-push. Never delete branches you did not create. Never touch files outside task scope. Never run `rm -rf` or any destructive equivalent.

**2. Token Discipline.** Scout researches first. Lead (Opus) only handles decomposition and synthesis. All reports use CodeAgents format — pseudocode plus English comments — which cuts token consumption 55–87% vs prose. Agents cite `path:line` instead of pasting file contents. State goes to files, not inline messages.

**3. Artifact Ownership.** Each task owns `.claude/artifacts/tasks/{id}/`. No agent modifies another agent's artifacts. Builder writes code to git worktrees. Critic writes to `tasks/{id}/review.md`. Scout writes to `tasks/{id}/research.md`. Guardian writes only to `guardian-alert.md`.

**4. Git Workflow.** All implementation in feature branches. Branch naming: `{agent}/{task-id}-{slug}`. Every commit includes a `Co-Authored-By` trailer for the agent. PRs require Critic review before merge.

**5. State Persistence.** `progress.json` is the cross-session handoff file. The pre-compact hook writes to it before context compaction. On session start, Lead reads it in under 5 tool calls. The audit log is append-only; it is never deleted or modified.

**6. Communication Protocol.** Agents communicate via files in `artifacts/`. Not inline messages, not function return values — files. Guardian monitors silently and only alerts on real anomalies.

**7. Cost Guardrails.** Opus: 10% of total tokens (Lead only). Sonnet: 70% (Scout, Builder, Critic, scheduled agents). Haiku: 20% (Guardian, dep-auditor, issue-triager). Guardian flags any session that burns 50K tokens without shipping progress.

---

## 4. Agent Definitions

Each agent is defined in a markdown file with YAML frontmatter. Claude Code reads these definitions when spawning sub-agents.

| Agent | Model | maxTurns | Tools | Writes Residuals? |
|-------|-------|----------|-------|-------------------|
| Scout | Sonnet | 25 | Read, Grep, Glob, WebFetch, WebSearch | Yes |
| Lead | Opus | — | All | Yes |
| Builder | Sonnet | 50 | Read, Write, Edit, Bash, Grep, Glob | Yes |
| Critic | Sonnet | 15 | Read, Grep, Glob | Yes |
| Guardian | Haiku | 10 | Read, Grep, Glob | No — read-only |
| Empire | Sonnet | — | OpenClaw tools + Telegram | Yes (to daily logs) |

**Scout** is research-only. It cannot use Edit, Write, or Bash. It has 25 turns to gather information and must summarize if it hits turn 20. It exits with a structured JSONL residual and a CodeAgents-format report.

**Builder** has the widest tool access and the highest turn budget (50). It operates in git worktrees, creates feature branches, and writes one atomic commit per logical change. It reads prior residuals before starting — weighted by the attention computation — and writes its own residual on completion.

**Critic** is review-only. It cannot modify source files. It has 15 turns to evaluate Builder's work against Scout's research, cross-referenced through attention weights. Its residual carries the APPROVE or BLOCK decision at full fidelity (per the ACON principle).

**Guardian** is the silent watchdog. It has read-only access to `residuals.jsonl` — it explicitly cannot write to the residual store. It checks for agents skipping residual writes, tag vocabulary violations, cost overruns, and scope creep. If nothing is wrong, it exits silently in fewer than 3 turns. False alarms are themselves a policy violation because they waste Lead's Opus budget.

**Empire** (OpenClaw) is the gateway agent. It lives in a separate runtime but is architecturally part of the same team. It reads the AttnRes bridge file before answering technical questions and writes `[attnres]` entries to its daily memory log afterward.

---

## 5. Agent Attention Residuals — First Principles

### The Research Origin

In March 2026, Moonshot AI (Kimi) published a paper on Attention Residuals. The core idea: transformer residual connections are fixed additive operations — every layer's output simply adds to the stream. AttnRes replaces this with a learned, softmax-weighted sum over prior layer outputs. Each layer has a learned pseudo-query `w_l`. Keys and values are `RMSNorm(h_i)` for all prior layers `i`. The output is:

```
h_l = h_{l-1} + Attn(w_l, RMSNorm(K), RMSNorm(V))
```

The Block variant groups layers into N=8 blocks. Standard residuals operate within each block; the attention mechanism fires only at block boundaries. This adds less than 2% overhead while matching a 1.25x compute baseline in GPQA-Diamond benchmarks.

### The Gap We Fill

No production multi-agent system does what AttnRes describes at the agent level. The landscape before Empire Cortex:

- **Anthropic**: condensed summary return. Lossy. The sub-agent's context collapses to a paragraph.
- **OpenAI Agents SDK**: full history pass-through. Accurate but bloated — every agent sees the entire conversation.
- **LangGraph**: typed state graph. Good for explicit hand-offs, no relevance weighting.
- **CrewAI**: semantic memory retrieval. Similarity-based but not depth-aware — does not model which agent's output matters most to which other agent.
- **AutoGen**: shared group chat history. No selective inclusion.

The universal failure mode: agents either drown in irrelevant context or lose critical decisions at compaction.

### The Mapping

| AttnRes Neural Concept | AgentAttnRes Empire Concept |
|---|---|
| Layer output `h_l` | Agent residual (one JSONL entry) |
| Learned pseudo-query `w_l` | Agent role profile + task tags |
| `RMSNorm(K) = RMSNorm(V)` | Normalized agent summaries (fixed-length) |
| Softmax over depth | Relevance score per prior residual |
| Block AttnRes (N=8) | Phase grouping: Research / Implementation / Review |
| Zero-init uniform weights | Cold-start affinity matrix |

The phase grouping is the Block AttnRes analog. Within a phase (e.g., two Scout residuals both in Research), decay is gentle: `0.95^stepsAgo`. Crossing a phase boundary — Scout's research being consumed by Builder in Implementation — applies an additional `0.7` multiplier per boundary crossed. This encodes the intuition that recent within-phase outputs are most relevant, but cross-phase signals still matter and should not be dropped entirely.

### Why This Matters Empirically

UC Berkeley's MAST taxonomy analyzed 1600+ multi-agent execution traces. Their failure breakdown:

- **13.55%** context-related failures (agent doesn't have enough information)
- **15.70%** step repetition (agent redoes work already done)
- **2.80%** conversation history loss (prior decisions vanish after compaction)
- **1.90%** ignored other agent input (agent proceeds as if parallel work didn't happen)

AgentAttnRes addresses all four categories: every agent output is persistent (no history loss), structured (no context ambiguity), and attention-weighted (relevant signals surface, irrelevant ones recede). The tag vocabulary and Jaccard similarity ensure that agents doing semantically related work share more weight, not just temporally adjacent agents.

---

## 6. The Computation Engine

The core module is `dashboard/src/lib/attn-residuals.ts`. It is pure — no I/O, no side effects, no framework dependencies. It can run in Node, in the browser, or be imported by any agent.

### Three Signals

**Signal 1: Role Affinity (static baseline)**

A 6×6 hand-tuned matrix encoding which agent benefits most from which other agent's output. These are the zero-init pseudo-query weights — the prior before any task-specific evidence.

```typescript
export const ROLE_AFFINITY: Record<string, Record<string, number>> = {
  scout:    { scout: 0.1, lead: 0.3, builder: 0.2, critic: 0.4, guardian: 0.1, empire: 0.6 },
  lead:     { scout: 0.9, lead: 0.1, builder: 0.3, critic: 0.5, guardian: 0.2, empire: 0.7 },
  builder:  { scout: 0.7, lead: 0.9, builder: 0.2, critic: 0.6, guardian: 0.1, empire: 0.5 },
  critic:   { scout: 0.5, lead: 0.4, builder: 0.9, critic: 0.1, guardian: 0.3, empire: 0.3 },
  guardian: { scout: 0.3, lead: 0.5, builder: 0.6, critic: 0.4, guardian: 0.1, empire: 0.4 },
  empire:   { scout: 0.8, lead: 0.6, builder: 0.5, critic: 0.3, guardian: 0.2, empire: 0.1 },
};
```

Reading the matrix: Builder benefits enormously from Lead (0.9) and Scout (0.7) — it needs the specification and the research. Critic benefits most from Builder (0.9) — it is reviewing Builder's output. Empire (OpenClaw) benefits most from Scout (0.8) and Lead (0.7) — it cares about research findings and architectural decisions, not the granular implementation.

**Signal 2: Tag Overlap (Jaccard similarity)**

Every residual carries tags from a controlled 25-word vocabulary. Jaccard similarity between the current task's tags and each prior residual's tags gives a content-based relevance score independent of role. The formula: `|intersection| / |union|`.

A floor of `0.2 + 0.8 * jaccardSimilarity` ensures that even zero tag overlap yields a minimum contribution — agents are never completely ignored, just de-weighted.

```typescript
export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
```

**Signal 3: Recency Decay (positional encoding over depth)**

```typescript
export function recencyDecay(
  currentPhase: AgentPhase,
  residualPhase: AgentPhase,
  stepsAgo: number,
): number {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const residualIdx = PHASE_ORDER.indexOf(residualPhase);
  const phaseBoundaries = Math.max(0, currentIdx - residualIdx);

  const withinDecay = Math.pow(0.95, stepsAgo);
  const crossDecay = Math.pow(0.7, phaseBoundaries);

  return withinDecay * crossDecay;
}
```

Within the same phase, each step back costs 5% — recent outputs matter slightly more than older ones. Each phase boundary crossed applies a 30% reduction. A Scout residual from three steps ago in the Research phase, being consumed by a Builder agent in Implementation, receives: `0.95^3 × 0.7^1 = 0.857 × 0.7 = 0.60`. Still substantial — this is how cross-phase knowledge transfer is preserved.

**Combination and Softmax**

The three signals multiply:

```typescript
const rawWeight = affinity * tagFactor * decay;
```

Then softmax-normalized with numerical stability (subtract max before exponentiation):

```typescript
export function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
```

The result is a probability distribution over all prior residuals — the agent's attention allocation.

### Controlled Tag Vocabulary

Both Claude Code agents and the OpenClaw Empire agent use the identical 25-tag vocabulary. This shared vocabulary is what makes the Jaccard comparison meaningful across systems. If each system used its own tag space, cross-system attention weights would degrade to random noise.

```
api-design   architecture   auth          config       data-model
debugging    deployment     documentation hooks        memory
messaging    monitoring     performance   refactoring  security
testing      ui             ux            dependency   migration
openclaw     dashboard      mcp           agent-protocol cost
```

---

## 7. The Residual Schema

Every agent writes one JSONL entry per phase completion. The schema is defined in `dashboard/src/lib/types.ts`:

```typescript
export interface AgentResidual {
  id: string;           // "{agent}-{ISO timestamp}"
  taskId: string;
  agent: string;        // "scout" | "lead" | "builder" | "critic" | "guardian"
  phase: AgentPhase;    // "research" | "implementation" | "review"
  timestamp: string;
  summary: string;      // 1-2 sentences, max 100 tokens (compressed observation)
  keyFindings: string[];// max 5 bullets
  artifacts: string[];  // file paths produced
  decisions: string[];  // FULL FIDELITY — never compressed (ACON principle)
  risks: string[];
  confidence: "high" | "medium" | "low";
  tags: string[];       // from controlled vocabulary only
  tokenCost: number;
}
```

The `decisions` field is the ACON principle in code. ACON stands for "Compress Observations, Preserve Decisions." The summary compresses what the agent saw. The decisions field records what the agent concluded at full fidelity — these are never summarized, never truncated, never paraphrased. This is what survives context compaction.

A real residual from task 004:

```json
{
  "id": "builder-2026-03-17T14:00:00Z",
  "taskId": "004",
  "agent": "builder",
  "phase": "implementation",
  "timestamp": "2026-03-17T14:00:00Z",
  "summary": "Built CC↔OC bridge: sync-residuals.sh hook, residual-bridge.ts parser, message-flow.tsx dual-path viz, OpenClaw SOUL.md + config.",
  "keyFindings": [
    "Bridge file: residuals-bridge.md synced via pre-compact hook",
    "Cross-system attention gets 1.5x weight bonus",
    "Empire agent added with AttnRes protocol",
    "Message Flow toggle shows dual OC/CC paths"
  ],
  "artifacts": [
    "dashboard/src/lib/residual-bridge.ts",
    "dashboard/src/components/attention/message-flow.tsx",
    ".claude/hooks/sync-residuals.sh"
  ],
  "decisions": ["Bidirectional sync: CC→OC via hook, OC→CC via dashboard parser"],
  "risks": ["jq dependency on Windows — needs manual install"],
  "confidence": "high",
  "tags": ["architecture", "agent-protocol", "openclaw", "mcp", "hooks"],
  "tokenCost": 18000
}
```

Note what this entry enables for every downstream agent: the artifacts field tells them exactly what files were produced. The decisions field tells them the architectural choice made and why. The risks field surfaces the `jq` dependency before it becomes a blocker. The tags enable cross-system Jaccard matching. None of this requires reading source files.

---

## 8. The CC↔OC Bridge

The bridge connects two AI runtimes with no API calls, no sockets, no polling infrastructure. It is pure file I/O. This is a deliberate constraint — it works without network configuration, survives reboots, and is fully inspectable.

### Direction 1: Claude Code → OpenClaw

**Trigger**: The Claude Code `PreCompact` hook fires before any context compaction event.

**Mechanism**: `sync-residuals.sh` finds all `residuals.jsonl` files across all tasks, feeds them to `jq`, sorts by confidence tier (high first, then medium, then low), takes the top 10, and formats them as structured markdown.

**Output**: Written to two paths (primary and workspace mirror):
- `~/.openclaw/memory/residuals-bridge.md`
- `~/.openclaw/workspace/memory/residuals-bridge.md`

**Format**:

```markdown
# AttnRes Bridge — Claude Code -> OpenClaw
> Last sync: 2026-03-17T14:30:00Z
> Source: Claude Code pre-compact hook
> Protocol: Read entries with weight > 0.3 fully; skim 0.1-0.3; skip < 0.1

## [builder] Built CC↔OC bridge: sync-residuals.sh hook + message flow viz
- **Task:** 004
- **Phase:** implementation
- **Confidence:** high
- **Weight:** 0.5
- **Tags:** architecture, agent-protocol, openclaw, mcp, hooks
- **Decisions:** Bidirectional sync: CC→OC via hook, OC→CC via dashboard parser
- **Risks:** jq dependency on Windows — needs manual install
- **Timestamp:** 2026-03-17T14:00:00Z
```

The header comment encodes the reading protocol. OpenClaw's Empire agent, via `SOUL.md`, is instructed to weight > 0.3 = full read, 0.1–0.3 = summary only, < 0.1 = skip. This threshold-based filtering is the attention mechanism as read-time behavior.

### Direction 2: OpenClaw → Claude Code

**Trigger**: Empire agent completes a task and writes to its daily memory log.

**Format** (in `~/.openclaw/memory/{date}.md`):

```
[attnres] agent=empire task=005 confidence=h
summary: User asked about AttnRes via Telegram. Found Kimi paper context, routed impl to CC.
decisions: Store CC architecture decisions in OC memory for future queries
tags: architecture, agent-protocol, openclaw, memory
```

**Parser**: `residual-bridge.ts` in the dashboard reads these logs, extracts `[attnres]` blocks via regex, and converts them into `BridgeResidual` objects — the same type as Claude Code residuals but with `source: "openclaw"`.

**Cross-system weight bonus**: When `computeBridgeWeights()` encounters a connection between a `claude-code` residual and an `openclaw` residual, it applies a 1.5× multiplier. Cross-system knowledge transfer is treated as more valuable than same-system connections. The intuition: if both runtimes independently concluded the same thing, that conclusion is more trustworthy.

```typescript
const crossBonus = a.source !== b.source ? 1.5 : 1.0;
const rawWeight = tagSim * recency * crossBonus * confMul;
```

### The Loop

```
Claude Code compacts context
    → pre-compact.sh fires
    → sync-residuals.sh writes residuals-bridge.md
    → OpenClaw Empire agent reads on next query
    → Empire answers informed by CC architecture decisions
    → Empire writes [attnres] to daily memory log
    → Dashboard reads OC log on next refresh
    → Unified attention graph updates
    → Next CC session reads OC residuals via bridge parser
    → Loop closes
```

---

## 9. Governance Hooks

Three hooks, registered in `settings.json`, run on every Claude Code event. They enforce the constitution automatically — no agent needs to remember the rules.

### post-tool.sh — Audit Logger

Fires after every tool use (matcher: `"*"`). Two jobs:

1. Appends a JSONL line to `audit/log.jsonl`:
   ```json
   {"ts":"2026-03-17T14:30:00Z","session":"abc123","tool":"Write","input_preview":"dashboard/src/lib/attn-residuals.ts..."}
   ```

2. Detects residual writes: if the tool input contains `residuals.jsonl`, logs an `attnres` audit event. This creates a traceable record of every time the attention residual store changes.

The audit log is append-only by convention enforced in the constitution. It is the forensic record of what every agent did and when.

### pre-compact.sh — State Saver + Bridge Trigger

Fires before context compaction. Three jobs in sequence:

1. **Timestamp and count**: Stamps `last_compaction` and increments `compaction_count` in `progress.json`. Preserves session continuity metadata.

2. **Residual promotion**: Scans all `tasks/*/residuals.jsonl`, extracts high-confidence entries, takes the top 3 most recent, merges with any previously promoted residuals (cap: 20 total), writes back to `progress.json`. This is how agent work survives across compaction events.

3. **Bridge sync**: Calls `sync-residuals.sh` to push the bridge file to OpenClaw.

The promotion cap of 20 residuals is a deliberate constraint. `progress.json` is read on every session start in under 5 tool calls — it cannot grow unbounded without degrading startup performance.

### sync-residuals.sh — CC→OC Bridge Writer

Called only by `pre-compact.sh`. Uses `jq` for JSON processing (requires `~/bin/jq.exe` on Windows). The script:

1. Finds all `residuals.jsonl` files recursively under `tasks/`
2. Concatenates their contents
3. Sorts: high-confidence first, then medium, then low
4. Takes the top 10
5. Formats as structured markdown per the bridge protocol
6. Writes to two locations (primary + workspace mirror)
7. Appends a sync event to `audit/log.jsonl`

If no residuals exist yet, writes a minimal bridge file noting this state. The bridge file always exists — OpenClaw never reads an absent file.

---

## 10. The Dashboard

The dashboard is a Next.js 16 application (`dashboard/`) with a sci-fi aesthetic. Six tabs: Overview, Attn Flow, Kanban, Agents, Audit Log, Health.

The Attention Flow tab is the architectural visualization. It has two view modes toggled by a button in the header.

### Attention Graph View

An SVG canvas (`900×520`) with three horizontal phase lanes (Research / Implementation / Review), each drawn as a dashed-border rectangle. Agent residuals are positioned as nodes within their phase lane, distributed horizontally by count.

**Nodes** (`ResidualNode`):
- Color-coded by model: violet (Opus), cyan (Sonnet), emerald (Haiku)
- Outer ring distinguishes source: solid cyan for Claude Code, dashed orange for OpenClaw
- Confidence dot in top-right corner: green (high), amber (medium), red (low)
- Active node (most recent residual) shows a pulsing ring
- Selected node shows a rotating dashed selection ring
- Click any node to open the slide-out detail panel

**Edges** (`AttentionEdge`):
- Quadratic bezier curves connecting residuals in temporal order
- `strokeWidth = 1 + weight * 4` — high-weight connections are visually thick
- Opacity: `0.15 + weight * 0.6` — low-weight connections fade into background
- Each edge has a glow filter layer (feGaussianBlur) for the sci-fi aesthetic
- Traveling particle: animated dot using SVG `<animateMotion>` along the bezier path — duration is inversely proportional to weight (`2 + (1-weight)*3` seconds), so high-attention connections have faster-moving particles

**Phase labels** are rendered at the left edge of each lane in monospace with letter-spacing, amber for research, cyan for implementation, violet for review — matching the `PHASE_COLORS` constants in `types.ts`.

All nodes and edges animate in on mount using `motion/react` spring animations, staggered by `0.1s * index`. The canvas is responsive via `viewBox` with `w-full h-full`.

The detail panel (`ResidualDetail`) slides in from the right as an `AnimatePresence`-controlled overlay. It shows the full residual — summary, key findings, artifacts, decisions, risks, tags, confidence, token cost — along with the computed attention weights for that node.

### Message Flow View

A dual-column timeline showing the OpenClaw and Claude Code message paths side by side, connected by an animated bridge arrow in the center. Each step is a `FlowStepCard` — clickable to expand detail bullets. Steps are color-coded by their system (user, openclaw, bridge, claude-code). The footer renders the bridge sync protocol details for both directions.

### Zustand Store

The global store (`store.ts`) holds:
- `residuals: AgentResidual[]` — the active residual set
- `attentionSnapshot: AttentionSnapshot | null` — computed weights
- `selectedResidual: string | null` — dashboard selection state
- `tasks`, `agents`, `auditEntries`, `serviceHealth` — the broader system state

Currently ships with demo data (`DEMO_RESIDUALS` from `attn-residuals.ts`). The demo data is realistic — 7 residuals from task 004, including Scout research, Lead decomposition, two Builder implementation entries, a Critic review, and two Empire (OpenClaw) residuals. The `getDemoAttentionWeights()` function computes actual weights from this demo data, so the graph is computed, not hardcoded.

---

## 11. Cross-Session State Persistence

Empire Cortex has four layers of state continuity, each addressing a different failure mode:

**Layer 1: Within a session — residuals.jsonl**

Active agents share state through `tasks/{id}/residuals.jsonl`. This file is append-only during a session. Every agent reads it before starting (via the Attention Residuals Protocol in their agent definition file) and appends their own entry on completion. No two agents write to the same file concurrently in normal operation — the linear flow (Scout → Builder → Critic) prevents races.

**Layer 2: Across compactions — progress.json**

When Claude Code compacts its context, it discards most of the conversation history. The `pre-compact.sh` hook runs first, promoting the top 3 high-confidence residuals from all tasks into `progress.json`. On the next session start, Lead reads `progress.json` — it gets the system state and the most important prior decisions without reading any task files. This is the architectural equivalent of `RMSNorm(K)` — a normalized summary of depth that travels with the agent.

**Layer 3: Across sessions — progress.json + branch state**

`progress.json` survives reboots. It carries `last_compaction`, `compaction_count`, and `attn_residuals.top_residuals[]`. Agents also read the git branch they are on — the branch name encodes the task ID and slug, which points directly to `tasks/{id}/residuals.jsonl`.

**Layer 4: Across systems — residuals-bridge.md**

The bridge file is written on every compaction and persists in OpenClaw's memory directory. The OpenClaw Empire agent reads it on every technical query. This makes Claude Code architectural decisions available to the OpenClaw runtime indefinitely — until the next bridge sync overwrites the file with more recent findings.

---

## 12. Message Flow — End to End

### Path A: Message to OpenClaw

```
You → Telegram / TUI
  → OpenClaw gateway receives (port 18789)
  → Empire agent initializes:
      AGENTS.md → SOUL.md → MEMORY.md (100-line always-in-context summary)
      reserveTokensFloor: 40,000 tokens
  → Read residuals-bridge.md
      weight > 0.3 → full read (summary + decisions + risks)
      weight 0.1-0.3 → summary only
      weight < 0.1 → skip
  → Hybrid memory search: vectorWeight=0.7 + BM25 textWeight=0.3
      MMR dedup (lambda=0.7), temporal decay 30-day half-life
      Check memory/{today}.md for active session context
  → Generate response informed by CC agent decisions + OC memory
  → Write [attnres] entry to memory/{today}.md
      format: agent=empire task={id} confidence={h/m/l}
      decisions at full fidelity
  → Reply to Telegram / TUI
```

### Path B: Message to Claude Code

```
You → Claude Code terminal
  → Lead (Opus) initializes:
      Read CLAUDE.md (constitution, Priority 0)
      Read progress.json → attn_residuals.top_residuals[]
  → Lead decomposes task, assigns agents
  → Lead writes residual to tasks/{id}/residuals.jsonl
  →
  → Scout:
      Read residuals.jsonl, prioritize by attention weight
      Research via Read/Grep/Glob/WebSearch
      Write research.md
      Append AgentResidual (tags, findings, decisions)
  →
  → Builder:
      Read residuals.jsonl
      Compute attention weights: softmax(roleAffinity × tagOverlap × recencyDecay)
      Weight > 0.3 → read fully; < 0.1 → skip
      Create branch: builder/{task-id}-{slug}
      Implement in git worktree
      Commit with Co-Authored-By trailer
      Append AgentResidual
  →
  → Critic:
      Read all residuals with attention weights
      Cross-reference Builder's work against Scout's research
      Write review.md
      APPROVE or BLOCK
      Append AgentResidual
  →
  → Guardian (background):
      Read audit log
      Scan residuals for violations: missing writes, tag violations, cost overruns
      Alert to guardian-alert.md only if anomaly found
      Otherwise: silent exit
  →
  → On context compaction:
      pre-compact.sh fires
      Promote top-3 high-confidence residuals → progress.json (cap: 20)
      sync-residuals.sh → write residuals-bridge.md
  →
  → Next OpenClaw query reads bridge → loop closes
```

---

## 13. Why This Architecture Works

**The agent hierarchy is a token budget, not just an org chart.** Opus at 10% means the most expensive model only touches decomposition and synthesis. Everything else — research, implementation, review, monitoring — runs on Sonnet (70%) and Haiku (20%). This is not an arbitrary policy. It encodes the insight that most work is execution, not orchestration, and execution does not require the most powerful model.

**The constitution is enforced at multiple levels.** `CLAUDE.md` is a document. The hooks are code. The agent definitions enforce tool restrictions. Settings.json enforces hook registration. The audit log makes violations visible. No single point of failure can cause an agent to behave undetected outside its scope.

**The bridge is file-based by necessity, not limitation.** A file-based bridge works across system reboots, does not require both systems to be running simultaneously, is fully inspectable with any text editor, and adds zero network configuration overhead. The trade-off — latency — does not matter for asynchronous knowledge transfer between agent sessions.

**The tag vocabulary is a shared type system.** Jaccard similarity only works if both systems use the same vocabulary. The 25-tag vocabulary is defined once (in `attn-residuals.ts`), referenced in every agent definition file, and enforced by Guardian. It is the semantic contract between Claude Code and OpenClaw.

**The ACON principle prevents the key failure mode.** Context compression kills most agent systems because summaries lose decisions. Empire's `decisions` field in every residual stores the critical architectural choices at full fidelity. Scout can summarize its observations to 2 sentences, but "Use Jaccard similarity for tag overlap (simple, effective)" and "Ship dashboard with demo data first, wire live later" are never paraphrased. They survive compaction intact.

**The demo data is real.** `DEMO_RESIDUALS` in `attn-residuals.ts` contains the actual residuals from task 004 — the task that implemented AgentAttnRes itself. When you open the dashboard, you are seeing the system's own construction process visualized as attention flow. The attention weights are computed in real time by the same `computeAttentionWeights()` function that agents use. The dashboard is not a mockup.

---

## 14. Running It

**Requirements:**
- Windows 11 (no Docker, no WSL required)
- Node.js + npm
- Git Bash (hooks run in bash)
- `jq.exe` at `~/bin/jq.exe` (for hook JSON processing — install from `jqlang.org`)
- GitHub CLI (`gh`) for repository operations
- OpenClaw CLI: `npm i -g openclaw`
- Claude Code CLI with API key

**Dashboard:**
```bash
cd D:/~Claude/dashboard
npm install
npm run dev
# Opens at http://localhost:3000
```

**Claude Code agents:** Agents run within Claude Code sessions. Lead (Opus) is the entry point. Sub-agents (Scout, Builder, Critic, Guardian) are spawned via the `Agent` tool, which Claude Code resolves against the definitions in `.claude/agents/`.

**OpenClaw:**
```bash
cd D:/openclaw
openclaw
# Empire agent initializes, reads SOUL.md, connects to Telegram
```

**Hooks fire automatically** on every tool use (post-tool.sh) and every compaction (pre-compact.sh). No manual invocation required once `settings.json` is in place.

---

## 15. What Comes Next

The current system is operational but has intentional gaps to address:

**Live dashboard wiring.** The dashboard currently reads from `DEMO_RESIDUALS`. The `parseClaudeCodeResiduals()` and `parseOpenClawMemory()` functions in `residual-bridge.ts` are written and tested — they need to be wired to the actual file paths at dashboard startup. This likely means a Next.js API route that reads the `tasks/*/residuals.jsonl` files server-side.

**Learned affinity weights.** The `ROLE_AFFINITY` matrix is hand-tuned. A future iteration could compute this from observed outcomes — if Builder's PRs that read Scout's output at high weight tend to pass Critic review with fewer iterations, the affinity value should increase. The matrix structure supports this; only the values need to change.

**Scheduled agents.** The constitution defines `dep-auditor` and `issue-triager` (Haiku, daily) and `auto-reviewer` and `report-generator` (Sonnet, weekly or on PR event). These are defined in the architecture but not yet implemented as agent definition files.

**Telegram / Discord integration for OpenClaw.** SOUL.md describes the Empire agent as connected to Telegram. The OpenClaw configuration in `openclaw.json` sets up the gateway. The actual bot registration and channel wiring is a one-time setup outside this codebase.

**Tag vocabulary validation.** Critic's review (task 004, `critic-2026-03-17T13:00:00Z`) flagged this: agents should validate tags against `CANONICAL_TAGS` before writing residuals. Currently enforced only by Guardian's anomaly detection, not at write time.

---

*Empire Cortex — built by Aditya Sharma (@Declan142) with Claude Code agents*
*AgentAttnRes adapted from Kimi/Moonshot AI's Attention Residuals (March 2026)*
*Repository: github.com/Declan142/empire-cortex*
*Branch at time of writing: `builder/005-attnres-bridge`*
