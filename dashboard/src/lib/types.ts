export type TaskStatus = "backlog" | "in_progress" | "review" | "done";

export type AgentModel = "opus" | "sonnet" | "haiku";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  agent?: string;
  agentModel?: AgentModel;
  createdAt: string;
  updatedAt: string;
  labels?: string[];
}

export interface Agent {
  id: string;
  name: string;
  model: AgentModel;
  role: string;
  status: "active" | "idle" | "error";
  lastAction?: string;
  lastActionAt?: string;
  tokensBurned: number;
  health: number[]; // sparkline data points (last 10)
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  agent: string;
  tool: string;
  action: string;
  severity: "info" | "warn" | "error" | "critical";
  details?: string;
}

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  url?: string;
  latency?: number;
  checkedAt?: string;
}

export const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "backlog", title: "Backlog" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export const MODEL_COLORS: Record<AgentModel, string> = {
  opus: "#8b5cf6",    // violet
  sonnet: "#06b6d4",  // cyan
  haiku: "#10b981",   // emerald
};
