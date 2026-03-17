"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEmpireStore } from "@/lib/store";
import { DEMO_RESIDUALS, getDemoAttentionWeights } from "@/lib/attn-residuals";
import { MODEL_COLORS, PHASE_COLORS } from "@/lib/types";
import type { AgentResidual, AgentPhase, AttentionWeight } from "@/lib/types";
import { ResidualDetail } from "./residual-detail";
import { Network, Zap, ArrowLeftRight } from "lucide-react";
import { MessageFlow } from "./message-flow";

// ── Layout Constants ──────────────────────────────────────────────────

const NODE_RADIUS = 30;
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 520;

const PHASE_CONFIG: Record<AgentPhase, { label: string; y: number }> = {
  research: { label: "RESEARCH", y: 80 },
  implementation: { label: "IMPLEMENTATION", y: 240 },
  review: { label: "REVIEW", y: 400 },
};

const AGENT_MODEL: Record<string, keyof typeof MODEL_COLORS> = {
  scout: "sonnet",
  builder: "sonnet",
  critic: "sonnet",
  lead: "opus",
  guardian: "haiku",
  empire: "sonnet",
};

// Source badge colors
const SOURCE_COLORS = {
  "claude-code": "#06b6d4",   // cyan
  openclaw: "#f97316",         // orange
} as const;

// ── Bezier Edge ──────────────────────────────────────────────────────

function AttentionEdge({
  x1, y1, x2, y2, weight, delay, color,
}: {
  x1: number; y1: number; x2: number; y2: number;
  weight: number; delay: number; color: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const controlOffset = Math.abs(y2 - y1) * 0.3 + 40;
  const d = `M ${x1} ${y1} Q ${midX - controlOffset} ${midY} ${x2} ${y2}`;

  const strokeWidth = 1 + weight * 4;
  const opacity = 0.15 + weight * 0.6;

  return (
    <g>
      {/* Glow layer */}
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth + 3}
        strokeOpacity={opacity * 0.3}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay, ease: "easeOut" }}
        filter="url(#glow)"
      />
      {/* Main line */}
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={opacity}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay, ease: "easeOut" }}
      />
      {/* Traveling particle */}
      <motion.circle
        r={2 + weight * 2}
        fill={color}
        opacity={0.8}
      >
        <animateMotion dur={`${2 + (1 - weight) * 3}s`} repeatCount="indefinite" path={d} />
      </motion.circle>
    </g>
  );
}

// ── Node ─────────────────────────────────────────────────────────────

function ResidualNode({
  residual, x, y, isSelected, isActive, onClick, delay,
}: {
  residual: AgentResidual; x: number; y: number;
  isSelected: boolean; isActive: boolean;
  onClick: () => void; delay: number;
}) {
  const model = AGENT_MODEL[residual.agent] ?? "sonnet";
  const color = MODEL_COLORS[model];
  const isOC = residual.agent === "empire";
  const sourceColor = isOC ? SOURCE_COLORS.openclaw : SOURCE_COLORS["claude-code"];

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 200 }}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {/* Selection ring */}
      {isSelected && (
        <motion.circle
          cx={x} cy={y} r={NODE_RADIUS + 8}
          fill="none" stroke={color} strokeWidth={2}
          strokeDasharray="4 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}

      {/* Active pulse */}
      {isActive && (
        <motion.circle
          cx={x} cy={y} r={NODE_RADIUS + 4}
          fill="none" stroke={color} strokeWidth={1.5}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}

      {/* Source ring (outer) — cyan for CC, orange for OC */}
      <circle
        cx={x} cy={y} r={NODE_RADIUS + 2}
        fill="none"
        stroke={sourceColor}
        strokeWidth={1.5}
        strokeOpacity={0.5}
        strokeDasharray={isOC ? "3 2" : "none"}
      />

      {/* Glow circle */}
      <circle
        cx={x} cy={y} r={NODE_RADIUS}
        fill={`${color}10`}
        stroke={color}
        strokeWidth={isSelected ? 2 : 1}
        strokeOpacity={isSelected ? 0.8 : 0.4}
        filter="url(#glow)"
      />

      {/* Agent initial */}
      <text
        x={x} y={y - 4}
        textAnchor="middle" dominantBaseline="central"
        fill={color}
        fontSize={16} fontFamily="monospace" fontWeight="bold"
      >
        {residual.agent[0].toUpperCase()}
      </text>

      {/* Agent name */}
      <text
        x={x} y={y + 14}
        textAnchor="middle" dominantBaseline="central"
        fill={color}
        fontSize={8} fontFamily="monospace"
        opacity={0.7}
      >
        {residual.agent}
      </text>

      {/* Source label */}
      <text
        x={x} y={y + NODE_RADIUS + 14}
        textAnchor="middle"
        fill={sourceColor}
        fontSize={7} fontFamily="monospace"
        opacity={0.6}
      >
        {isOC ? "OPENCLAW" : "CC"}
      </text>

      {/* Confidence dot */}
      <circle
        cx={x + NODE_RADIUS - 4} cy={y - NODE_RADIUS + 4} r={4}
        fill={
          residual.confidence === "high" ? "#10b981" :
          residual.confidence === "medium" ? "#f59e0b" : "#ef4444"
        }
      />
    </motion.g>
  );
}

// ── Phase Group Box ──────────────────────────────────────────────────

function PhaseGroup({ phase, y, width }: { phase: AgentPhase; y: number; width: number }) {
  const color = PHASE_COLORS[phase];
  const config = PHASE_CONFIG[phase];

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <rect
        x={30} y={y - 50}
        width={width - 60} height={130}
        rx={12}
        fill={`${color}06`}
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.15}
        strokeDasharray="6 4"
      />
      <text
        x={50} y={y - 30}
        fill={color}
        fontSize={10} fontFamily="monospace"
        fontWeight="bold" opacity={0.5}
        letterSpacing={2}
      >
        {config.label}
      </text>
    </motion.g>
  );
}

// ── Floating Particles ───────────────────────────────────────────────

function FlowParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      duration: Math.random() * 12 + 8,
      delay: Math.random() * 5,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-500/15"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function AttentionFlow() {
  const [view, setView] = useState<"graph" | "flow">("graph");
  const {
    residuals: storeResiduals,
    setResiduals,
    attentionSnapshot,
    setAttentionSnapshot,
    selectedResidual,
    setSelectedResidual,
  } = useEmpireStore();

  // Load demo data on mount if store is empty
  useEffect(() => {
    if (storeResiduals.length === 0) {
      setResiduals(DEMO_RESIDUALS);
      setAttentionSnapshot(getDemoAttentionWeights());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const residuals = storeResiduals.length > 0 ? storeResiduals : DEMO_RESIDUALS;
  const weights = attentionSnapshot?.weights ?? getDemoAttentionWeights().weights;

  // Compute node positions: group by phase, spread horizontally
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const byPhase: Record<string, AgentResidual[]> = { research: [], implementation: [], review: [] };

    for (const r of residuals) {
      byPhase[r.phase]?.push(r);
    }

    for (const [phase, items] of Object.entries(byPhase)) {
      const baseY = PHASE_CONFIG[phase as AgentPhase].y;
      const spacing = (CANVAS_WIDTH - 160) / (items.length + 1);
      items.forEach((r, i) => {
        positions[r.id] = { x: 80 + spacing * (i + 1), y: baseY };
      });
    }

    return positions;
  }, [residuals]);

  // Build edges: for each weight, draw from source residual to the "current agent" node
  // In demo mode, show all pairwise attention connections
  const edges = useMemo(() => {
    const result: {
      key: string; x1: number; y1: number; x2: number; y2: number;
      weight: number; color: string;
    }[] = [];

    // Connect each residual to the ones that come after it (showing forward flow)
    for (let i = 0; i < residuals.length; i++) {
      for (let j = i + 1; j < residuals.length; j++) {
        const source = residuals[i];
        const target = residuals[j];
        const sourcePos = nodePositions[source.id];
        const targetPos = nodePositions[target.id];
        if (!sourcePos || !targetPos) continue;

        // Find weight from the attention snapshot
        const w = weights.find((w) => w.residualId === source.id);
        const weight = w?.weight ?? 0.15;

        // Only draw edges with meaningful weight
        if (weight < 0.05) continue;

        const targetModel = AGENT_MODEL[target.agent] ?? "sonnet";
        const color = MODEL_COLORS[targetModel];

        result.push({
          key: `${source.id}->${target.id}`,
          x1: sourcePos.x, y1: sourcePos.y,
          x2: targetPos.x, y2: targetPos.y,
          weight,
          color,
        });
      }
    }

    return result;
  }, [residuals, nodePositions, weights]);

  const selectedRes = residuals.find((r) => r.id === selectedResidual);
  const selectedWeights = selectedResidual
    ? weights.filter((w) => w.residualId === selectedResidual)
    : [];

  // Find the "active" node (last residual = most recent agent output)
  const activeResidualId = residuals.length > 0 ? residuals[residuals.length - 1].id : null;

  return (
    <div className="h-full flex flex-col relative">
      <FlowParticles />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6 relative z-10"
      >
        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <Network className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-mono text-violet-400">ATTENTION FLOW</h2>
          <p className="text-xs text-slate-500 font-mono">
            {view === "graph" ? `Agent Attention Residuals — Task ${residuals[0]?.taskId ?? "N/A"}` : "Message Flow Architecture — CC ↔ OC"}
          </p>
        </div>
        {/* View toggle */}
        <button
          onClick={() => setView(view === "graph" ? "flow" : "graph")}
          className="ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/[0.08] hover:border-white/[0.15] transition-colors text-slate-400 hover:text-slate-200"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono">{view === "graph" ? "MSG FLOW" : "ATTN GRAPH"}</span>
        </button>
        <div className="ml-auto flex items-center gap-6">
          {/* Model legend */}
          <div className="flex items-center gap-3">
            {(["opus", "sonnet", "haiku"] as const).map((model) => (
              <div key={model} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: MODEL_COLORS[model] }}
                />
                <span className="text-[10px] font-mono text-slate-500 capitalize">{model}</span>
              </div>
            ))}
          </div>
          {/* Source legend */}
          <div className="flex items-center gap-3 border-l border-white/[0.08] pl-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS["claude-code"] }} />
              <span className="text-[10px] font-mono text-slate-500">Claude Code</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border border-dashed" style={{ borderColor: SOURCE_COLORS.openclaw, background: `${SOURCE_COLORS.openclaw}30` }} />
              <span className="text-[10px] font-mono text-slate-500">OpenClaw</span>
            </div>
          </div>
        </div>
      </motion.div>

      {view === "flow" ? (
        /* Message Flow View */
        <div className="flex-1 relative z-10 overflow-y-auto glass rounded-xl p-6">
          <MessageFlow />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4 mb-4 relative z-10"
          >
            {[
              { label: "Residuals", value: residuals.length, color: "#06b6d4" },
              { label: "CC Agents", value: residuals.filter((r) => r.agent !== "empire").length, color: "#06b6d4" },
              { label: "OC Agents", value: residuals.filter((r) => r.agent === "empire").length, color: "#f97316" },
              { label: "Connections", value: edges.length, color: "#8b5cf6" },
              { label: "Avg Weight", value: `${(weights.reduce((s, w) => s + w.weight, 0) / Math.max(weights.length, 1) * 100).toFixed(1)}%`, color: "#10b981" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-lg px-3 py-2 flex items-center gap-2">
                <Zap className="w-3 h-3" style={{ color: stat.color }} />
                <span className="text-[10px] text-slate-500 font-mono uppercase">{stat.label}</span>
                <span className="text-sm font-mono font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </motion.div>

          {/* SVG Canvas */}
          <div className="flex-1 relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="glass rounded-xl p-4 h-full"
            >
              <svg
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                className="w-full h-full"
                style={{ maxHeight: "calc(100vh - 280px)" }}
              >
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Phase groups */}
                {(Object.keys(PHASE_CONFIG) as AgentPhase[]).map((phase) => (
                  <PhaseGroup
                    key={phase}
                    phase={phase}
                    y={PHASE_CONFIG[phase].y}
                    width={CANVAS_WIDTH}
                  />
                ))}

                {/* Edges */}
                {edges.map((edge, i) => (
                  <AttentionEdge
                    key={edge.key}
                    x1={edge.x1} y1={edge.y1}
                    x2={edge.x2} y2={edge.y2}
                    weight={edge.weight}
                    delay={0.5 + i * 0.1}
                    color={edge.color}
                  />
                ))}

                {/* Nodes */}
                {residuals.map((r, i) => {
                  const pos = nodePositions[r.id];
                  if (!pos) return null;
                  return (
                    <ResidualNode
                      key={r.id}
                      residual={r}
                      x={pos.x} y={pos.y}
                      isSelected={selectedResidual === r.id}
                      isActive={r.id === activeResidualId}
                      onClick={() => setSelectedResidual(selectedResidual === r.id ? null : r.id)}
                      delay={0.3 + i * 0.1}
                    />
                  );
                })}
              </svg>
            </motion.div>

            {/* Detail Panel */}
            <AnimatePresence>
              {selectedRes && (
                <ResidualDetail
                  residual={selectedRes}
                  incomingWeights={selectedWeights}
                  onClose={() => setSelectedResidual(null)}
                />
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
