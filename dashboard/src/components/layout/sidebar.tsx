"use client";

import { useEmpireStore } from "@/lib/store";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Activity,
  Zap,
  Radar,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Radar },
  { id: "attention", label: "Attn Flow", icon: Network },
  { id: "kanban", label: "Kanban", icon: LayoutDashboard },
  { id: "agents", label: "Agents", icon: Users },
  { id: "audit", label: "Audit Log", icon: ScrollText },
  { id: "health", label: "Health", icon: Activity },
];

export function Sidebar() {
  const { activeTab, setActiveTab } = useEmpireStore();

  return (
    <aside className="w-16 lg:w-56 glass border-r border-white/[0.08] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-white/[0.08]">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-cyan-400" />
        </div>
        <span className="hidden lg:block font-mono font-bold text-cyan-400 tracking-wider text-sm">
          EMPIRE
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
              activeTab === item.id
                ? "bg-cyan-500/10 text-cyan-400 glow-cyan"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Status footer */}
      <div className="p-4 border-t border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden lg:block text-xs text-slate-500 font-mono">
            v4.0 live
          </span>
        </div>
      </div>
    </aside>
  );
}
