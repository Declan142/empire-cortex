"use client";

import { create } from "zustand";
import type { Task, Agent, AuditEntry, ServiceHealth, TaskStatus, AgentResidual, AttentionSnapshot } from "./types";

interface EmpireStore {
  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;

  // Audit
  auditLog: AuditEntry[];
  addAuditEntry: (entry: AuditEntry) => void;
  setAuditLog: (entries: AuditEntry[]) => void;

  // Health
  services: ServiceHealth[];
  setServices: (services: ServiceHealth[]) => void;

  // Attention Residuals
  residuals: AgentResidual[];
  setResiduals: (residuals: AgentResidual[]) => void;
  addResidual: (residual: AgentResidual) => void;
  attentionSnapshot: AttentionSnapshot | null;
  setAttentionSnapshot: (snapshot: AttentionSnapshot | null) => void;
  selectedResidual: string | null;
  setSelectedResidual: (id: string | null) => void;

  // UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useEmpireStore = create<EmpireStore>((set) => ({
  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  moveTask: (taskId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
      ),
    })),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),

  // Audit
  auditLog: [],
  addAuditEntry: (entry) =>
    set((state) => ({ auditLog: [entry, ...state.auditLog].slice(0, 200) })),
  setAuditLog: (entries) => set({ auditLog: entries }),

  // Health
  services: [],
  setServices: (services) => set({ services }),

  // Attention Residuals
  residuals: [],
  setResiduals: (residuals) => set({ residuals }),
  addResidual: (residual) =>
    set((state) => ({ residuals: [...state.residuals, residual] })),
  attentionSnapshot: null,
  setAttentionSnapshot: (snapshot) => set({ attentionSnapshot: snapshot }),
  selectedResidual: null,
  setSelectedResidual: (id) => set({ selectedResidual: id }),

  // UI
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
