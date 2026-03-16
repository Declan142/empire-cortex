"use client";

import { useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState } from "react";
import { useEmpireStore } from "@/lib/store";
import { COLUMNS, type Task, type TaskStatus } from "@/lib/types";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { Plus } from "lucide-react";
import { NewTaskDialog } from "./new-task-dialog";

// Demo data for initial state
const DEMO_TASKS: Task[] = [
  {
    id: "t1",
    title: "Install OpenClaw native on Windows",
    status: "done",
    agent: "Builder",
    agentModel: "sonnet",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T05:00:00Z",
    labels: ["phase-1"],
  },
  {
    id: "t2",
    title: "Configure memory (reserveFloor=40K, flush, hybrid)",
    status: "done",
    agent: "Builder",
    agentModel: "sonnet",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T05:10:00Z",
    labels: ["phase-1", "memory"],
  },
  {
    id: "t3",
    title: "Build Empire Dashboard — Kanban + Agents + Audit",
    description: "Next.js 15 + dnd-kit + Motion + dark glassmorphism",
    status: "in_progress",
    agent: "Lead",
    agentModel: "opus",
    createdAt: "2026-03-16T05:15:00Z",
    updatedAt: "2026-03-16T05:15:00Z",
    labels: ["phase-2", "dashboard"],
  },
  {
    id: "t4",
    title: "Wire MCP servers (mem0, github, playwright, gmail)",
    status: "backlog",
    agent: "Scout",
    agentModel: "sonnet",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T00:00:00Z",
    labels: ["phase-3"],
  },
  {
    id: "t5",
    title: "Set up Telegram channel (reuse NanoClaw bot token)",
    status: "backlog",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T00:00:00Z",
    labels: ["phase-1"],
  },
  {
    id: "t6",
    title: "Set up WhatsApp via Baileys QR scan",
    status: "backlog",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T00:00:00Z",
    labels: ["phase-3"],
  },
  {
    id: "t7",
    title: "Fix Empire hooks (post-tool audit, pre-compact summary)",
    status: "backlog",
    agent: "Builder",
    agentModel: "sonnet",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T00:00:00Z",
    labels: ["phase-4"],
  },
  {
    id: "t8",
    title: "Sign up Mem0 Cloud + configure MCP",
    status: "backlog",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T00:00:00Z",
    labels: ["phase-3", "memory"],
  },
  {
    id: "t9",
    title: "Research OpenClaw v2026.3.13 features",
    status: "done",
    agent: "Scout",
    agentModel: "sonnet",
    createdAt: "2026-03-16T00:00:00Z",
    updatedAt: "2026-03-16T04:00:00Z",
    labels: ["research"],
  },
  {
    id: "t10",
    title: "Write SOUL.md + AGENTS.md + USER.md",
    status: "done",
    agent: "Builder",
    agentModel: "sonnet",
    createdAt: "2026-03-16T05:00:00Z",
    updatedAt: "2026-03-16T05:10:00Z",
    labels: ["phase-1"],
  },
];

export function KanbanBoard() {
  const { tasks, setTasks, moveTask } = useEmpireStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);

  // Load demo data on mount
  useEffect(() => {
    if (tasks.length === 0) {
      setTasks(DEMO_TASKS);
    }
  }, [tasks.length, setTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Dropped on a column
      const isColumn = COLUMNS.some((c) => c.id === overId);
      if (isColumn) {
        moveTask(taskId, overId as TaskStatus);
        return;
      }

      // Dropped on another task — move to that task's column
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        moveTask(taskId, overTask.status);
      }
    },
    [moveTask, tasks]
  );

  const tasksByColumn = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.id),
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
            Mission Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tasks.length} tasks across {COLUMNS.length} columns
          </p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {tasksByColumn.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={col.tasks}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} />
    </div>
  );
}
