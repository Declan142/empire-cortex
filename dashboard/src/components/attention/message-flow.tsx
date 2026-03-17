"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MODEL_COLORS } from "@/lib/types";
import { MessageSquare, ArrowRight, Zap, Database, FileText, GitBranch, Search, CheckCircle, Shield } from "lucide-react";

// ── Flow Step Definition ─────────────────────────────────────────────

interface FlowStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
  system: "user" | "openclaw" | "bridge" | "claude-code";
  detail: string[];
}

const OC_STEPS: FlowStep[] = [
  {
    id: "oc-1", label: "You", sublabel: "Send message",
    icon: <MessageSquare className="w-4 h-4" />, color: "#e2e8f0", system: "user",
    detail: ["Message sent via Telegram / Discord / DM", "OpenClaw gateway receives on port 18789"],
  },
  {
    id: "oc-2", label: "Empire Agent", sublabel: "AGENTS.md + SOUL.md loaded",
    icon: <Zap className="w-4 h-4" />, color: MODEL_COLORS.sonnet, system: "openclaw",
    detail: [
      "Load order: AGENTS.md → SOUL.md → MEMORY.md",
      "100-line MEMORY.md always in context",
      "reserveTokensFloor: 40,000 tokens",
    ],
  },
  {
    id: "oc-3", label: "Read Bridge", sublabel: "residuals-bridge.md",
    icon: <FileText className="w-4 h-4" />, color: "#f97316", system: "bridge",
    detail: [
      "Check ~/.openclaw/memory/residuals-bridge.md",
      "Parse CC residuals sorted by weight",
      "weight > 0.3 → read fully",
      "weight 0.1-0.3 → summary only",
      "weight < 0.1 → skip",
    ],
  },
  {
    id: "oc-4", label: "Memory Search", sublabel: "Hybrid vector + BM25",
    icon: <Search className="w-4 h-4" />, color: "#8b5cf6", system: "openclaw",
    detail: [
      "memory_search(\"{topic}\")",
      "vectorWeight: 0.7, textWeight: 0.3",
      "MMR dedup (lambda: 0.7)",
      "Temporal decay: 30-day half-life",
      "Checks memory/{today}.md for active context",
    ],
  },
  {
    id: "oc-5", label: "Respond", sublabel: "Answer + write residual",
    icon: <CheckCircle className="w-4 h-4" />, color: "#10b981", system: "openclaw",
    detail: [
      "Generate response using CC context + OC memory",
      "Write finding to memory/{date}.md with [attnres] tag",
      "Format: agent=empire task={id} confidence={h/m/l}",
      "Include decisions at full fidelity (ACON)",
    ],
  },
];

const CC_STEPS: FlowStep[] = [
  {
    id: "cc-1", label: "You", sublabel: "Send message in Claude Code",
    icon: <MessageSquare className="w-4 h-4" />, color: "#e2e8f0", system: "user",
    detail: ["Message typed in Claude Code terminal", "Lead (Opus) reads constitution + progress.json"],
  },
  {
    id: "cc-2", label: "Lead (Opus)", sublabel: "Decompose + assign",
    icon: <Zap className="w-4 h-4" />, color: MODEL_COLORS.opus, system: "claude-code",
    detail: [
      "Read progress.json → attn_residuals.top_residuals[]",
      "Check promoted residuals from prior sessions",
      "Decompose task, assign to Scout/Builder/Critic",
      "Write AgentResidual to tasks/{id}/residuals.jsonl",
    ],
  },
  {
    id: "cc-3", label: "Scout (Sonnet)", sublabel: "Research + gather context",
    icon: <Search className="w-4 h-4" />, color: MODEL_COLORS.sonnet, system: "claude-code",
    detail: [
      "Read residuals.jsonl → attention-weights.json",
      "Prioritize: weight > 0.3 fully, < 0.1 skip",
      "Research via Grep/Glob/WebSearch",
      "Append AgentResidual with tags from controlled vocab",
    ],
  },
  {
    id: "cc-4", label: "Builder (Sonnet)", sublabel: "Implement",
    icon: <GitBranch className="w-4 h-4" />, color: MODEL_COLORS.sonnet, system: "claude-code",
    detail: [
      "Read Scout's residuals with attention weights",
      "softmax(roleAffinity × tagOverlap × recencyDecay)",
      "Code in git worktree, commits with Co-Authored-By",
      "Append AgentResidual on completion",
    ],
  },
  {
    id: "cc-5", label: "Critic (Sonnet)", sublabel: "Review",
    icon: <CheckCircle className="w-4 h-4" />, color: MODEL_COLORS.sonnet, system: "claude-code",
    detail: [
      "Cross-reference Scout research via attention weights",
      "Catch issues Scout flagged that Builder missed",
      "APPROVE / BLOCK decision",
      "Append AgentResidual with review findings",
    ],
  },
  {
    id: "cc-6", label: "Guardian (Haiku)", sublabel: "Monitor silently",
    icon: <Shield className="w-4 h-4" />, color: MODEL_COLORS.haiku, system: "claude-code",
    detail: [
      "READ-ONLY for residual store",
      "Flag: agents skipping writes, tag violations, cost overruns",
      "Alert only on real problems",
      "Does NOT write to residuals.jsonl",
    ],
  },
  {
    id: "cc-7", label: "Pre-Compact Hook", sublabel: "Sync → OpenClaw",
    icon: <Database className="w-4 h-4" />, color: "#f97316", system: "bridge",
    detail: [
      "Triggered before context compaction",
      "Promote top-3 high-confidence residuals → progress.json",
      "Cap at 20 promoted residuals total",
      "Run sync-residuals.sh → write residuals-bridge.md",
      "OpenClaw empire agent reads on next query",
    ],
  },
];

// ── System Badge ─────────────────────────────────────────────────────

function SystemBadge({ system }: { system: FlowStep["system"] }) {
  const config = {
    user: { label: "YOU", bg: "bg-slate-700/50", text: "text-slate-300" },
    openclaw: { label: "OPENCLAW", bg: "bg-orange-500/10", text: "text-orange-400" },
    bridge: { label: "BRIDGE", bg: "bg-amber-500/10", text: "text-amber-400" },
    "claude-code": { label: "CLAUDE CODE", bg: "bg-cyan-500/10", text: "text-cyan-400" },
  }[system];

  return (
    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// ── Single Flow Step ─────────────────────────────────────────────────

function FlowStepCard({
  step, index, isActive, onClick,
}: {
  step: FlowStep; index: number; isActive: boolean; onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: "easeOut" }}
      className="flex items-start gap-3"
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <motion.div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          style={{
            background: isActive ? `${step.color}25` : `${step.color}10`,
            border: `2px solid ${isActive ? step.color : `${step.color}40`}`,
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClick}
        >
          <div style={{ color: step.color }}>{step.icon}</div>
        </motion.div>
        {index < 6 && (
          <motion.div
            className="w-0.5 h-8"
            style={{ background: `${step.color}20` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: index * 0.12 + 0.2 }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-mono font-bold" style={{ color: step.color }}>
            {step.label}
          </span>
          <SystemBadge system={step.system} />
        </div>
        <p className="text-xs text-slate-500 font-mono mb-1">{step.sublabel}</p>

        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 border-l-2 pl-3" style={{ borderColor: `${step.color}30` }}>
                {step.detail.map((d, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="text-[11px] text-slate-400 font-mono"
                  >
                    {d}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Animated Connection Arrow ────────────────────────────────────────

function BridgeArrow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="flex flex-col items-center gap-1 mx-4 self-center"
    >
      <motion.div
        animate={{ x: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ArrowRight className="w-6 h-6 text-amber-500/60" />
      </motion.div>
      <span className="text-[8px] font-mono text-amber-500/50 tracking-wider">BRIDGE</span>
      <motion.div
        className="w-full h-0.5 rounded-full bg-gradient-to-r from-cyan-500/30 via-amber-500/50 to-orange-500/30"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export function MessageFlow() {
  const [activeOC, setActiveOC] = useState<string | null>(null);
  const [activeCC, setActiveCC] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="text-base font-bold font-mono text-amber-400">MESSAGE FLOW ARCHITECTURE</h3>
        <p className="text-[10px] text-slate-500 font-mono mt-1">
          Click any step to expand details. Bridge syncs residuals bidirectionally.
        </p>
      </motion.div>

      {/* Dual flow columns */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-0">
        {/* OpenClaw flow */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-4 pb-2 border-b border-orange-500/20"
          >
            <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center">
              <Zap className="w-3 h-3 text-orange-400" />
            </div>
            <span className="text-xs font-mono font-bold text-orange-400">OPENCLAW PATH</span>
            <span className="text-[9px] font-mono text-slate-600 ml-auto">Telegram / Discord / DM</span>
          </motion.div>
          {OC_STEPS.map((step, i) => (
            <FlowStepCard
              key={step.id}
              step={step}
              index={i}
              isActive={activeOC === step.id}
              onClick={() => setActiveOC(activeOC === step.id ? null : step.id)}
            />
          ))}
        </div>

        {/* Bridge connection */}
        <BridgeArrow delay={0.8} />

        {/* Claude Code flow */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-4 pb-2 border-b border-cyan-500/20"
          >
            <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center">
              <Zap className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">CLAUDE CODE PATH</span>
            <span className="text-[9px] font-mono text-slate-600 ml-auto">Terminal / IDE</span>
          </motion.div>
          {CC_STEPS.map((step, i) => (
            <FlowStepCard
              key={step.id}
              step={step}
              index={i}
              isActive={activeCC === step.id}
              onClick={() => setActiveCC(activeCC === step.id ? null : step.id)}
            />
          ))}
        </div>
      </div>

      {/* Bridge detail footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="glass rounded-lg p-4 border border-amber-500/10"
      >
        <p className="text-[10px] font-mono text-amber-400/80 font-bold mb-2">BRIDGE SYNC PROTOCOL</p>
        <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-500">
          <div>
            <p className="text-cyan-400/60 font-bold mb-1">CC → OC (pre-compact hook)</p>
            <p>1. Scan all tasks/*/residuals.jsonl</p>
            <p>2. Select top-10 by confidence (high → med → low)</p>
            <p>3. Write ~/.openclaw/memory/residuals-bridge.md</p>
            <p>4. Format: weight + summary + decisions + tags</p>
          </div>
          <div>
            <p className="text-orange-400/60 font-bold mb-1">OC → CC (memory flush)</p>
            <p>1. Empire writes [attnres] entries to memory/{"{date}"}.md</p>
            <p>2. Dashboard reads OC memory logs on refresh</p>
            <p>3. residual-bridge.ts parses [attnres] format</p>
            <p>4. Unified attention weights via computeBridgeWeights()</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
