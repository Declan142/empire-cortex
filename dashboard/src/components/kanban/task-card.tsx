"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import type { Task } from "@/lib/types";
import { MODEL_COLORS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const modelColor = task.agentModel
    ? MODEL_COLORS[task.agentModel]
    : "#94a3b8";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        y: 0,
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging
          ? "0 0 25px rgba(6,182,212,0.4)"
          : "0 0 0px transparent",
      }}
      transition={{ duration: 0.2 }}
      className="glass glass-hover rounded-lg p-3 cursor-grab active:cursor-grabbing group"
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          className="mt-0.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-slate-500" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 leading-snug">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {task.agent && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{ borderColor: modelColor, color: modelColor }}
              >
                {task.agent}
              </Badge>
            )}
            {task.labels?.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
