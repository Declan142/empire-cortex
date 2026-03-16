"use client";

import { motion } from "motion/react";
import { X, FileText, AlertTriangle, CheckCircle, Tag } from "lucide-react";
import type { AgentResidual, AttentionWeight } from "@/lib/types";
import { MODEL_COLORS, PHASE_COLORS } from "@/lib/types";

const AGENT_MODEL: Record<string, keyof typeof MODEL_COLORS> = {
  scout: "sonnet",
  builder: "sonnet",
  critic: "sonnet",
  lead: "opus",
  guardian: "haiku",
};

interface ResidualDetailProps {
  residual: AgentResidual;
  incomingWeights: AttentionWeight[];
  onClose: () => void;
}

export function ResidualDetail({ residual, incomingWeights, onClose }: ResidualDetailProps) {
  const model = AGENT_MODEL[residual.agent] ?? "sonnet";
  const color = MODEL_COLORS[model];
  const phaseColor = PHASE_COLORS[residual.phase];

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="absolute top-0 right-0 w-96 h-full glass border-l border-white/[0.08] z-30 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 glass border-b border-white/[0.08] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono"
            style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
          >
            {residual.agent[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-mono font-bold capitalize" style={{ color }}>
              {residual.agent}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: phaseColor }}>
              {residual.phase}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Summary */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Summary</p>
          <p className="text-sm text-slate-300 leading-relaxed">{residual.summary}</p>
        </div>

        {/* Key Findings */}
        {residual.keyFindings.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Key Findings</p>
            <ul className="space-y-1.5">
              {residual.keyFindings.map((finding, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-400">
                  <CheckCircle className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisions */}
        {residual.decisions.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Decisions (ACON)</p>
            <ul className="space-y-1.5">
              {residual.decisions.map((decision, i) => (
                <li key={i} className="text-xs text-cyan-400/80 font-mono bg-cyan-500/5 rounded px-2 py-1.5">
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {residual.risks.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Risks</p>
            <ul className="space-y-1.5">
              {residual.risks.map((risk, i) => (
                <li key={i} className="flex gap-2 text-xs text-amber-400/80">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Artifacts */}
        {residual.artifacts.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Artifacts</p>
            <ul className="space-y-1">
              {residual.artifacts.map((artifact, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="truncate">{artifact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {residual.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] text-slate-400 border border-white/[0.06]"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Attention Weights (incoming) */}
        {incomingWeights.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mb-2">
              Attention Weights (incoming)
            </p>
            <div className="space-y-2">
              {incomingWeights
                .sort((a, b) => b.weight - a.weight)
                .map((w) => (
                  <div key={w.residualId} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 capitalize">{w.agent}</span>
                      <span className="text-slate-500">{(w.weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${w.weight * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                      />
                    </div>
                    <p className="text-[9px] text-slate-600">{w.reason}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-white/[0.06] pt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-600">Confidence</span>
            <span className={
              residual.confidence === "high" ? "text-emerald-400" :
              residual.confidence === "medium" ? "text-amber-400" : "text-red-400"
            }>
              {residual.confidence}
            </span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-600">Token Cost</span>
            <span className="text-slate-400">{residual.tokenCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-600">Timestamp</span>
            <span className="text-slate-400">{new Date(residual.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
