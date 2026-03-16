"use client";

import { useEffect } from "react";
import { useEmpireStore } from "@/lib/store";
import type { Agent } from "@/lib/types";
import { MODEL_COLORS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { Bot, Zap, Brain, Shield, Search, Hammer, Eye } from "lucide-react";

const DEMO_AGENTS: Agent[] = [
  {
    id: "lead",
    name: "Lead",
    model: "opus",
    role: "Orchestrator — decomposes tasks, synthesizes results",
    status: "active",
    lastAction: "Assigned Phase 2 dashboard build",
    lastActionAt: "2026-03-16T05:15:00Z",
    tokensBurned: 12450,
    health: [85, 90, 88, 92, 95, 93, 97, 94, 96, 98],
  },
  {
    id: "scout",
    name: "Scout",
    model: "sonnet",
    role: "Research — explores codebases, gathers context",
    status: "idle",
    lastAction: "Completed OpenClaw v2026.3.13 deep research",
    lastActionAt: "2026-03-16T04:30:00Z",
    tokensBurned: 34200,
    health: [70, 75, 80, 85, 82, 88, 90, 87, 85, 88],
  },
  {
    id: "builder",
    name: "Builder",
    model: "sonnet",
    role: "Implementation — writes code, runs tests",
    status: "active",
    lastAction: "Building Empire Dashboard components",
    lastActionAt: "2026-03-16T05:25:00Z",
    tokensBurned: 28900,
    health: [90, 92, 88, 95, 93, 90, 94, 96, 92, 95],
  },
  {
    id: "critic",
    name: "Critic",
    model: "sonnet",
    role: "Review — code quality, security, correctness",
    status: "idle",
    lastAction: "Reviewed OpenClaw config changes",
    lastActionAt: "2026-03-16T05:00:00Z",
    tokensBurned: 8700,
    health: [95, 93, 97, 94, 96, 98, 95, 97, 96, 98],
  },
  {
    id: "guardian",
    name: "Guardian",
    model: "haiku",
    role: "Monitor — anomalies, cost overruns, policy violations",
    status: "active",
    lastAction: "Monitoring session token burn",
    lastActionAt: "2026-03-16T05:20:00Z",
    tokensBurned: 4200,
    health: [98, 97, 99, 98, 100, 99, 98, 100, 99, 100],
  },
];

const AGENT_ICONS: Record<string, React.ElementType> = {
  lead: Brain,
  scout: Search,
  builder: Hammer,
  critic: Eye,
  guardian: Shield,
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 30;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AgentGrid() {
  const { agents, setAgents } = useEmpireStore();

  useEffect(() => {
    if (agents.length === 0) setAgents(DEMO_AGENTS);
  }, [agents.length, setAgents]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
          Agent Grid
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {agents.filter((a) => a.status === "active").length} active /{" "}
          {agents.length} total
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent, i) => {
          const Icon = AGENT_ICONS[agent.id] || Bot;
          const color = MODEL_COLORS[agent.model];

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass glass-hover border-white/[0.08]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: `${color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color }} />
                      </div>
                      <div>
                        <CardTitle
                          className="text-base font-mono"
                          style={{ color }}
                        >
                          {agent.name}
                        </CardTitle>
                        <p className="text-[11px] text-slate-500 uppercase font-mono">
                          {agent.model}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        agent.status === "active"
                          ? "default"
                          : agent.status === "error"
                          ? "destructive"
                          : "secondary"
                      }
                      className={`text-[10px] ${
                        agent.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full mr-1 ${
                          agent.status === "active"
                            ? "bg-emerald-400 animate-pulse"
                            : agent.status === "error"
                            ? "bg-red-400"
                            : "bg-slate-500"
                        }`}
                      />
                      {agent.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-400">{agent.role}</p>

                  {agent.lastAction && (
                    <div className="text-xs">
                      <span className="text-slate-500">Last: </span>
                      <span className="text-slate-300">
                        {agent.lastAction}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono">
                      <span className="text-slate-500">Tokens: </span>
                      <span className="text-slate-300">
                        {(agent.tokensBurned / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <Sparkline data={agent.health} color={color} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
