"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";

interface ColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  isOver?: boolean;
}

const COLUMN_ACCENTS: Record<TaskStatus, string> = {
  backlog: "border-t-slate-500",
  in_progress: "border-t-cyan-500",
  review: "border-t-violet-500",
  done: "border-t-emerald-500",
};

export function Column({ id, title, tasks }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl glass border-t-2 min-w-[280px] w-[280px]",
        COLUMN_ACCENTS[id],
        isOver && "pulse-glow border-cyan-500/50"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-slate-300 font-mono uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-xs font-mono text-slate-500 bg-white/[0.05] px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 p-2 space-y-2 overflow-auto min-h-[200px]">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-slate-600 font-mono">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
