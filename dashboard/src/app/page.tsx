"use client";

import { useEmpireStore } from "@/lib/store";
import { Overview } from "@/components/overview/overview";
import { KanbanBoard } from "@/components/kanban/board";
import { AgentGrid } from "@/components/agents/agent-grid";
import { AuditStream } from "@/components/audit/audit-stream";
import { HealthMonitor } from "@/components/health/health-monitor";

export default function DashboardPage() {
  const activeTab = useEmpireStore((s) => s.activeTab);

  return (
    <div className="h-full">
      {activeTab === "overview" && <Overview />}
      {activeTab === "kanban" && <KanbanBoard />}
      {activeTab === "agents" && <AgentGrid />}
      {activeTab === "audit" && <AuditStream />}
      {activeTab === "health" && <HealthMonitor />}
    </div>
  );
}
