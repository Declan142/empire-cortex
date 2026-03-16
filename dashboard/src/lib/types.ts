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

// ── Agent Attention Residuals (AgentAttnRes) ──────────────────────────

export type AgentPhase = "research" | "implementation" | "review";

export const PHASE_COLORS: Record<AgentPhase, string> = {
  research: "#f59e0b",       // amber
  implementation: "#06b6d4", // cyan
  review: "#8b5cf6",         // violet
};

export interface AgentResidual {
  id: string;                    // "{agent}-{timestamp}"
  taskId: string;
  agent: string;                 // "scout" | "lead" | "builder" | "critic" | "guardian"
  phase: AgentPhase;
  timestamp: string;
  summary: string;               // 1-2 sentences (max 100 tokens)
  keyFindings: string[];         // max 5 bullet points
  artifacts: string[];           // file paths produced
  decisions: string[];           // full fidelity (ACON principle)
  risks: string[];
  confidence: "high" | "medium" | "low";
  tags: string[];                // controlled vocabulary
  tokenCost: number;
}

export interface AttentionWeight {
  residualId: string;
  agent: string;
  phase: string;
  weight: number;                // 0.0-1.0, softmax-normalized
  reason: string;                // human-readable explanation
}

export interface AttentionSnapshot {
  taskId: string;
  computedAt: string;
  currentAgent: string;
  weights: AttentionWeight[];
}
