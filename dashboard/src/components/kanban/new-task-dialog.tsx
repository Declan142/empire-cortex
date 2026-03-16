"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEmpireStore } from "@/lib/store";
import type { TaskStatus } from "@/lib/types";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTaskDialog({ open, onOpenChange }: NewTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const addTask = useEmpireStore((s) => s.addTask);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      id: `t-${Date.now()}`,
      title: title.trim(),
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setTitle("");
    setStatus("backlog");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 font-mono">
            New Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/[0.05] border-white/[0.1]"
            autoFocus
          />
          <div className="flex gap-2">
            {(["backlog", "in_progress", "review", "done"] as TaskStatus[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                    status === s
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-white/[0.05] text-slate-400 hover:bg-white/[0.1]"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              )
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            Create Task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
