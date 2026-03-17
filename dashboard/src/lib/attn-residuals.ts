/**
 * Agent Attention Residuals (AgentAttnRes)
 *
 * Adapts Kimi's Attention Residuals (Moonshot AI, March 2026) to multi-agent
 * orchestration. Instead of fixed linear handoff (Scout → Lead → Builder → Critic),
 * each agent gets attention-weighted context from ALL prior agent outputs.
 *
 * Core formula (analogous to AttnRes pseudo-query · RMSNorm(K) → softmax):
 *   weight_raw[i] = roleAffinity × tagOverlap × recencyDecay
 *   weights = softmax(weight_raw)
 */

import type { AgentResidual, AgentPhase, AttentionWeight, AttentionSnapshot } from "./types";

// ── Controlled Tag Vocabulary ─────────────────────────────────────────

export const CANONICAL_TAGS = [
  "api-design", "architecture", "auth", "config", "data-model",
  "debugging", "deployment", "documentation", "hooks", "memory",
  "messaging", "monitoring", "performance", "refactoring", "security",
  "testing", "ui", "ux", "dependency", "migration",
  "openclaw", "dashboard", "mcp", "agent-protocol", "cost",
] as const;

export type CanonicalTag = typeof CANONICAL_TAGS[number];

// ── Phase Assignment ──────────────────────────────────────────────────

export const AGENT_PHASE: Record<string, AgentPhase> = {
  scout: "research",
  lead: "implementation",
  builder: "implementation",
  critic: "review",
  guardian: "review",
  empire: "research",   // OpenClaw gateway agent
};

// ── Role Affinity Matrix (= "zero-init" pseudo-query weights) ─────────
// How much agent X typically benefits from agent Y's output.

export const ROLE_AFFINITY: Record<string, Record<string, number>> = {
  scout:    { scout: 0.1, lead: 0.3, builder: 0.2, critic: 0.4, guardian: 0.1, empire: 0.6 },
  lead:     { scout: 0.9, lead: 0.1, builder: 0.3, critic: 0.5, guardian: 0.2, empire: 0.7 },
  builder:  { scout: 0.7, lead: 0.9, builder: 0.2, critic: 0.6, guardian: 0.1, empire: 0.5 },
  critic:   { scout: 0.5, lead: 0.4, builder: 0.9, critic: 0.1, guardian: 0.3, empire: 0.3 },
  guardian: { scout: 0.3, lead: 0.5, builder: 0.6, critic: 0.4, guardian: 0.1, empire: 0.4 },
  empire:   { scout: 0.8, lead: 0.6, builder: 0.5, critic: 0.3, guardian: 0.2, empire: 0.1 },
};

// ── Softmax ───────────────────────────────────────────────────────────

export function softmax(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max)); // numerical stability
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// ── Jaccard Similarity (tag overlap = query·key dot product analog) ──

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

// ── Recency Decay (= positional encoding over depth) ─────────────────
// Within same phase (block): 0.95 per step. Across phase boundary: 0.7.

const PHASE_ORDER: AgentPhase[] = ["research", "implementation", "review"];

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

// ── Main: Compute Attention Weights ──────────────────────────────────

export interface ComputeAttentionInput {
  currentAgent: string;
  currentPhase: AgentPhase;
  taskTags: string[];
  residuals: AgentResidual[];
  affinityAdjustments?: Record<string, number>; // "builder->scout": 0.05
}

export function computeAttentionWeights(input: ComputeAttentionInput): AttentionWeight[] {
  const { currentAgent, currentPhase, taskTags, residuals, affinityAdjustments } = input;

  if (residuals.length === 0) return [];

  const rawWeights: number[] = residuals.map((residual, i) => {
    // Signal 1: Role affinity
    const baseAffinity = ROLE_AFFINITY[currentAgent]?.[residual.agent] ?? 0.3;
    const adjustmentKey = `${currentAgent}->${residual.agent}`;
    const adjustment = affinityAdjustments?.[adjustmentKey] ?? 0;
    const affinity = Math.max(0.01, Math.min(1, baseAffinity + adjustment));

    // Signal 2: Tag overlap (Jaccard similarity)
    const tagScore = jaccardSimilarity(taskTags, residual.tags);
    // Ensure minimum so tags don't zero out everything
    const tagFactor = 0.2 + 0.8 * tagScore;

    // Signal 3: Recency decay
    const stepsAgo = residuals.length - 1 - i;
    const decay = recencyDecay(currentPhase, residual.phase, stepsAgo);

    return affinity * tagFactor * decay;
  });

  const normalizedWeights = softmax(rawWeights);

  return residuals.map((residual, i) => {
    const w = normalizedWeights[i];
    const parts: string[] = [];
    const baseAffinity = ROLE_AFFINITY[currentAgent]?.[residual.agent] ?? 0.3;
    if (baseAffinity >= 0.7) parts.push("high role affinity");
    const tagScore = jaccardSimilarity(taskTags, residual.tags);
    if (tagScore >= 0.3) parts.push(`tag overlap ${(tagScore * 100).toFixed(0)}%`);
    const stepsAgo = residuals.length - 1 - i;
    if (stepsAgo === 0) parts.push("most recent");
    if (residual.phase !== currentPhase) parts.push("cross-phase");

    return {
      residualId: residual.id,
      agent: residual.agent,
      phase: residual.phase,
      weight: Math.round(w * 1000) / 1000,
      reason: parts.length > 0 ? parts.join(", ") : "baseline",
    };
  });
}

// ── Snapshot Builder ─────────────────────────────────────────────────

export function createAttentionSnapshot(
  taskId: string,
  currentAgent: string,
  weights: AttentionWeight[],
): AttentionSnapshot {
  return {
    taskId,
    computedAt: new Date().toISOString(),
    currentAgent,
    weights,
  };
}

// ── Demo Data ────────────────────────────────────────────────────────
// Realistic demo for dashboard visualization before live wiring.

export const DEMO_RESIDUALS: AgentResidual[] = [
  {
    id: "scout-2026-03-17T10:00:00Z",
    taskId: "004",
    agent: "scout",
    phase: "research",
    timestamp: "2026-03-17T10:00:00Z",
    summary: "Kimi AttnRes replaces fixed residuals with softmax depth-attention. Block variant uses N=8 blocks for <2% overhead. +7.5 GPQA-Diamond.",
    keyFindings: [
      "Pseudo-query w_l is per-layer learned constant, NOT input-conditioned",
      "K = V = RMSNorm(prior layer outputs)",
      "Block AttnRes: standard residuals within blocks, attention at boundaries",
      "Matches 1.25x compute baseline at equivalent loss",
      "No production agent system uses attention-weighted context routing",
    ],
    artifacts: [".claude/artifacts/tasks/004/research.md"],
    decisions: ["Apply AttnRes to agent pipeline as AgentAttnRes"],
    risks: ["Hand-tuned affinity matrix vs learned weights"],
    confidence: "high",
    tags: ["architecture", "agent-protocol", "performance"],
    tokenCost: 12000,
  },
  {
    id: "scout-2026-03-17T10:30:00Z",
    taskId: "004",
    agent: "scout",
    phase: "research",
    timestamp: "2026-03-17T10:30:00Z",
    summary: "Surveyed 10 residual techniques (Highway→DenseNet→DenseFormer→DCA→AttnRes) and 5 agent frameworks. MAST taxonomy: 13.55% of agent failures are context-related.",
    keyFindings: [
      "DenseFormer: static scalar weights over depth (2024)",
      "DCA: full input-dependent cross-attention (ICML 2025)",
      "DeepSeek mHC: width expansion, orthogonal to depth access",
      "MAST: step repetition 15.7%, info withholding 0.85%",
      "No existing system does attention over prior agent outputs",
    ],
    artifacts: [".claude/artifacts/tasks/004/research-landscape.md"],
    decisions: ["AgentAttnRes is genuinely novel — white space in research"],
    risks: ["Overhead with only 4-5 agents may not justify complexity"],
    confidence: "high",
    tags: ["architecture", "agent-protocol", "documentation"],
    tokenCost: 12000,
  },
  {
    id: "lead-2026-03-17T11:00:00Z",
    taskId: "004",
    agent: "lead",
    phase: "implementation",
    timestamp: "2026-03-17T11:00:00Z",
    summary: "Decomposed AgentAttnRes into 4 phases: types+computation, agent protocols, dashboard viz, memory integration. Assigned Builder for full implementation.",
    keyFindings: [
      "3 signals: role affinity × tag overlap × recency decay → softmax",
      "Block grouping: Research / Implementation / Review phases",
      "Dashboard: SVG graph with animated edges showing attention flow",
      "Memory: top-3 residuals promoted to progress.json cross-session",
    ],
    artifacts: [".claude/plans/declarative-bubbling-leaf.md"],
    decisions: [
      "Use Jaccard similarity for tag overlap (simple, effective)",
      "Ship dashboard with demo data first, wire live later",
      "Cap promoted residuals at 20 in progress.json",
    ],
    risks: [],
    confidence: "high",
    tags: ["architecture", "agent-protocol", "ui", "memory"],
    tokenCost: 8000,
  },
  {
    id: "builder-2026-03-17T12:00:00Z",
    taskId: "004",
    agent: "builder",
    phase: "implementation",
    timestamp: "2026-03-17T12:00:00Z",
    summary: "Implemented types, computation module, agent protocols, and dashboard Attention Flow tab with animated SVG visualization.",
    keyFindings: [
      "attn-residuals.ts: pure computation module, 150 lines",
      "Attention Flow tab: SVG nodes + bezier edges + motion animations",
      "Agent protocols added to scout, builder, critic, guardian .md files",
      "Zustand store extended with AttnRes slice",
    ],
    artifacts: [
      "dashboard/src/lib/attn-residuals.ts",
      "dashboard/src/components/attention/attention-flow.tsx",
      "dashboard/src/components/attention/residual-detail.tsx",
    ],
    decisions: ["Used custom SVG over Recharts Sankey for sci-fi aesthetic control"],
    risks: [],
    confidence: "high",
    tags: ["ui", "architecture", "agent-protocol", "dashboard"],
    tokenCost: 15000,
  },
  {
    id: "critic-2026-03-17T13:00:00Z",
    taskId: "004",
    agent: "critic",
    phase: "review",
    timestamp: "2026-03-17T13:00:00Z",
    summary: "Reviewed AgentAttnRes implementation. Clean architecture, good separation of concerns. Softmax numerically stable. Minor: add tag vocabulary validation.",
    keyFindings: [
      "Computation module is pure with no side effects — good",
      "Demo data is realistic and exercises all code paths",
      "Edge animation performance acceptable for <20 nodes",
      "Suggest: validate tags against CANONICAL_TAGS in production",
    ],
    artifacts: [".claude/artifacts/tasks/004/review.md"],
    decisions: ["APPROVE with minor suggestion for tag validation"],
    risks: ["SVG animation may lag with >50 residuals — unlikely in practice"],
    confidence: "high",
    tags: ["testing", "performance", "ui"],
    tokenCost: 5000,
  },
  // ── OpenClaw residuals (bridged from empire agent) ──
  {
    id: "empire-2026-03-17T09:30:00Z",
    taskId: "005",
    agent: "empire",
    phase: "research",
    timestamp: "2026-03-17T09:30:00Z",
    summary: "User asked about AttnRes via OpenClaw. Searched memory, found Kimi paper context. Provided overview and suggested Claude Code implementation.",
    keyFindings: [
      "Kimi's AttnRes paper published March 2026",
      "Block variant recommended for agent systems (few layers)",
      "User wants both CC and OC to share attention context",
    ],
    artifacts: [],
    decisions: ["Route implementation to Claude Code agents via bridge"],
    risks: [],
    confidence: "high",
    tags: ["architecture", "agent-protocol", "openclaw", "memory"],
    tokenCost: 3000,
  },
  {
    id: "empire-2026-03-17T14:00:00Z",
    taskId: "005",
    agent: "empire",
    phase: "research",
    timestamp: "2026-03-17T14:00:00Z",
    summary: "Read residuals-bridge.md from Claude Code sync. Builder completed all 4 phases. Updated OpenClaw memory with implementation decisions for future queries.",
    keyFindings: [
      "Bridge sync working: 5 CC residuals received",
      "Softmax attention with Jaccard+recency confirmed as approach",
      "Dashboard Attn Flow tab operational",
    ],
    artifacts: ["~/.openclaw/memory/2026-03-17.md"],
    decisions: ["Store CC architecture decisions in OC memory for user queries"],
    risks: [],
    confidence: "high",
    tags: ["memory", "openclaw", "agent-protocol", "mcp"],
    tokenCost: 2000,
  },
];

// Pre-computed attention weights for the demo data
export function getDemoAttentionWeights(): AttentionSnapshot {
  const weights = computeAttentionWeights({
    currentAgent: "critic",
    currentPhase: "review",
    taskTags: ["architecture", "agent-protocol", "ui", "dashboard"],
    residuals: DEMO_RESIDUALS,
  });

  return createAttentionSnapshot("004", "critic", weights);
}
