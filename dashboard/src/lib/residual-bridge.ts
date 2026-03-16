/**
 * residual-bridge.ts — AttnRes Bridge: Claude Code ↔ OpenClaw sync
 *
 * This module handles bidirectional residual synchronization:
 * - CC→OC: Reads Claude Code residuals.jsonl, writes bridge file for OpenClaw
 * - OC→CC: Reads OpenClaw daily memory logs, extracts [attnres] entries
 *
 * Used by the dashboard to show unified attention flow from both systems.
 */

import type { AgentResidual, AttentionWeight } from "./types";

// ── Types ────────────────────────────────────────────────────────────

export interface BridgeResidual extends AgentResidual {
  source: "claude-code" | "openclaw";
}

export interface BridgeSnapshot {
  lastSync: string;
  residuals: BridgeResidual[];
  weights: AttentionWeight[];
  stats: {
    ccCount: number;
    ocCount: number;
    totalConnections: number;
    avgWeight: number;
  };
}

// ── Parse OpenClaw [attnres] entries from daily logs ─────────────────

const ATTNRES_REGEX = /\[attnres\]\s*agent=(\w+)\s+task=(\S+)\s+confidence=(\w+)/;
const FIELD_REGEX = /^-?\s*\*?\*?(\w+)\*?\*?:\s*(.+)$/;

export function parseOpenClawMemory(content: string): BridgeResidual[] {
  const residuals: BridgeResidual[] = [];
  const blocks = content.split(/\n(?=\[attnres\])/);

  for (const block of blocks) {
    const headerMatch = block.match(ATTNRES_REGEX);
    if (!headerMatch) continue;

    const [, agent, taskId, confidence] = headerMatch;
    const fields: Record<string, string> = {};

    for (const line of block.split("\n").slice(1)) {
      const fieldMatch = line.match(FIELD_REGEX);
      if (fieldMatch) {
        fields[fieldMatch[1].toLowerCase()] = fieldMatch[2].trim();
      }
    }

    residuals.push({
      id: `oc-${agent}-${Date.now()}`,
      taskId,
      agent,
      phase: agent === "empire" ? "research" : "implementation",
      timestamp: fields.timestamp || new Date().toISOString(),
      summary: fields.summary || "OpenClaw agent finding",
      keyFindings: fields.findings?.split(";").map((s) => s.trim()) ?? [],
      artifacts: [],
      decisions: fields.decisions?.split(";").map((s) => s.trim()) ?? [],
      risks: fields.risks?.split(";").map((s) => s.trim()).filter(Boolean) ?? [],
      confidence: (confidence === "h" ? "high" : confidence === "m" ? "medium" : "low") as "high" | "medium" | "low",
      tags: fields.tags?.split(",").map((s) => s.trim()) ?? ["openclaw"],
      tokenCost: 0,
      source: "openclaw",
    });
  }

  return residuals;
}

// ── Parse Claude Code residuals.jsonl ────────────────────────────────

export function parseClaudeCodeResiduals(jsonlContent: string): BridgeResidual[] {
  const results: BridgeResidual[] = [];
  for (const line of jsonlContent.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as AgentResidual;
      results.push({ ...r, source: "claude-code" });
    } catch {
      // skip malformed lines
    }
  }
  return results;
}

// ── Compute cross-system attention weights ───────────────────────────

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function recencyDecay(timestamp: string, halfLifeMs: number = 24 * 60 * 60 * 1000): number {
  const age = Date.now() - new Date(timestamp).getTime();
  return Math.exp(-0.693 * (age / halfLifeMs));
}

export function computeBridgeWeights(residuals: BridgeResidual[]): AttentionWeight[] {
  const weights: AttentionWeight[] = [];

  for (let i = 0; i < residuals.length; i++) {
    for (let j = i + 1; j < residuals.length; j++) {
      const a = residuals[i];
      const b = residuals[j];

      // Tag similarity (semantic relevance)
      const tagSim = jaccardSimilarity(a.tags, b.tags);

      // Recency of the source residual
      const recency = recencyDecay(a.timestamp);

      // Cross-system bonus: CC↔OC connections get 1.5x weight
      const crossBonus = a.source !== b.source ? 1.5 : 1.0;

      // Confidence multiplier
      const confMap = { high: 1.0, medium: 0.7, low: 0.4 };
      const confMul = confMap[a.confidence] * confMap[b.confidence];

      const rawWeight = tagSim * recency * crossBonus * confMul;

      if (rawWeight > 0.01) {
        weights.push({
          residualId: a.id,
          agent: a.agent,
          phase: a.phase,
          weight: Math.min(rawWeight, 1.0),
          reason: `tags:${tagSim.toFixed(2)} rec:${recency.toFixed(2)} ${a.source !== b.source ? "cross-sys" : "same-sys"}`,
        });
      }
    }
  }

  // Normalize via softmax
  if (weights.length > 0) {
    const maxW = Math.max(...weights.map((w) => w.weight));
    const expWeights = weights.map((w) => Math.exp((w.weight - maxW) * 5));
    const sumExp = expWeights.reduce((s, e) => s + e, 0);
    weights.forEach((w, i) => {
      w.weight = expWeights[i] / sumExp;
    });
  }

  return weights;
}

// ── Build unified bridge snapshot ────────────────────────────────────

export function buildBridgeSnapshot(
  ccResiduals: BridgeResidual[],
  ocResiduals: BridgeResidual[]
): BridgeSnapshot {
  const all = [...ccResiduals, ...ocResiduals].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const weights = computeBridgeWeights(all);

  return {
    lastSync: new Date().toISOString(),
    residuals: all,
    weights,
    stats: {
      ccCount: ccResiduals.length,
      ocCount: ocResiduals.length,
      totalConnections: weights.length,
      avgWeight: weights.length > 0
        ? weights.reduce((s, w) => s + w.weight, 0) / weights.length
        : 0,
    },
  };
}
