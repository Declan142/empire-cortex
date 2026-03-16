"use client";

import { useEffect } from "react";
import { useEmpireStore } from "@/lib/store";
import type { AuditEntry } from "@/lib/types";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Info,
  AlertCircle,
  XCircle,
} from "lucide-react";

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  critical: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-600/10",
    border: "border-red-600/30",
  },
};

const DEMO_AUDIT: AuditEntry[] = [
  {
    id: "a1",
    timestamp: "2026-03-16T05:25:00Z",
    agent: "Builder",
    tool: "Write",
    action: "Created dashboard/src/components/kanban/board.tsx",
    severity: "info",
  },
  {
    id: "a2",
    timestamp: "2026-03-16T05:20:00Z",
    agent: "Guardian",
    tool: "Monitor",
    action: "Session token burn at 45K — within budget",
    severity: "info",
  },
  {
    id: "a3",
    timestamp: "2026-03-16T05:15:00Z",
    agent: "Lead",
    tool: "Agent",
    action: "Dispatched Builder for Phase 2 dashboard build",
    severity: "info",
  },
  {
    id: "a4",
    timestamp: "2026-03-16T05:10:00Z",
    agent: "Builder",
    tool: "Edit",
    action: "Updated openclaw.json — disabled Telegram/Discord placeholder tokens",
    severity: "warn",
    details: "Channels will retry-spam with invalid tokens; disabled until real tokens pasted",
  },
  {
    id: "a5",
    timestamp: "2026-03-16T05:05:00Z",
    agent: "Builder",
    tool: "Write",
    action: "Created SOUL.md, AGENTS.md, USER.md, MEMORY.md for OpenClaw",
    severity: "info",
  },
  {
    id: "a6",
    timestamp: "2026-03-16T05:00:00Z",
    agent: "Builder",
    tool: "Edit",
    action: "Injected fresh OAuth token into openclaw.json",
    severity: "warn",
    details: "OAuth tokens expire ~10h; consider console API key for stability",
  },
  {
    id: "a7",
    timestamp: "2026-03-16T04:30:00Z",
    agent: "Scout",
    tool: "WebSearch",
    action: "Deep research: OpenClaw v2026.3.13, Claude Code v2.1.76, auth status",
    severity: "info",
  },
  {
    id: "a8",
    timestamp: "2026-03-16T04:00:00Z",
    agent: "Guardian",
    tool: "Monitor",
    action: "VmmemWSL consuming 10.7GB — recommended Docker/WSL shutdown",
    severity: "error",
    details: "Docker Desktop WSL distro was running alongside Ubuntu, eating 82% of RAM",
  },
  {
    id: "a9",
    timestamp: "2026-03-16T03:30:00Z",
    agent: "Builder",
    tool: "Bash",
    action: "Killed Docker services and WSL — freed ~10GB RAM",
    severity: "info",
  },
  {
    id: "a10",
    timestamp: "2026-03-16T03:00:00Z",
    agent: "Lead",
    tool: "Agent",
    action: "Initiated Empire V4 architecture design — 5 parallel scout agents",
    severity: "info",
  },
];

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function AuditStream() {
  const { auditLog, setAuditLog } = useEmpireStore();

  useEffect(() => {
    if (auditLog.length === 0) setAuditLog(DEMO_AUDIT);
  }, [auditLog.length, setAuditLog]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
          Audit Stream
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time agent activity log — {auditLog.length} entries
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          <AnimatePresence mode="popLayout">
            {auditLog.map((entry, i) => {
              const config = SEVERITY_CONFIG[entry.severity];
              const Icon = config.icon;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass rounded-lg p-3 border-l-2 ${config.border}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${config.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 border-white/10"
                        >
                          {entry.agent}
                        </Badge>
                        <span className="text-[10px] text-slate-600 font-mono">
                          {entry.tool}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono ml-auto">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.action}</p>
                      {entry.details && (
                        <p className="text-xs text-slate-500 mt-1">
                          {entry.details}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
