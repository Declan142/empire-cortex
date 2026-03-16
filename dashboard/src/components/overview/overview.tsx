"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEmpireStore } from "@/lib/store";
import {
  Zap,
  Activity,
  Brain,
  Radio,
  Shield,
  Clock,
  TrendingUp,
} from "lucide-react";

// Animated counter that rolls up from 0
function AnimatedCounter({
  value,
  duration = 1.5,
  suffix = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const end = start + duration * 1000;

    const tick = () => {
      const now = Date.now();
      const progress = Math.min((now - start) / (duration * 1000), 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (now < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// Pulsing ring animation
function StatusRing({ status }: { status: "nominal" | "warning" | "critical" }) {
  const colors = {
    nominal: { ring: "#06b6d4", glow: "rgba(6,182,212,0.3)" },
    warning: { ring: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
    critical: { ring: "#ef4444", glow: "rgba(239,68,68,0.3)" },
  };
  const c = colors[status];

  return (
    <div className="relative w-40 h-40 mx-auto">
      {/* Outer pulse */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: `2px solid ${c.ring}` }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Middle ring */}
      <motion.div
        className="absolute inset-3 rounded-full"
        style={{ border: `2px solid ${c.ring}`, boxShadow: `0 0 20px ${c.glow}` }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.7, 0.4, 0.7],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      />
      {/* Inner circle */}
      <div
        className="absolute inset-6 rounded-full flex items-center justify-center"
        style={{ background: `${c.ring}15`, border: `1px solid ${c.ring}40` }}
      >
        <div className="text-center">
          <Zap className="w-8 h-8 mx-auto mb-1" style={{ color: c.ring }} />
          <p className="text-xs font-mono uppercase tracking-wider" style={{ color: c.ring }}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}

// Floating particle dots
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-500/20"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Activity wave
function ActivityWave() {
  const bars = 30;

  return (
    <div className="flex items-end gap-[2px] h-12">
      {Array.from({ length: bars }, (_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-cyan-500/40"
          animate={{
            height: [4, Math.random() * 40 + 8, 4],
          }}
          transition={{
            duration: 1.2 + Math.random() * 0.8,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Stat card with animation
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="glass glass-hover rounded-xl p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold font-mono" style={{ color }}>
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
    </motion.div>
  );
}

// Scrolling log line
function LiveLogLine() {
  const logs = [
    "[Scout] Completed OpenClaw v2026.3.13 deep research",
    "[Builder] Updated openclaw.json — memory config applied",
    "[Guardian] Session token burn at 45K — within budget",
    "[Lead] Dispatched Builder for Phase 2 dashboard",
    "[Builder] Created SOUL.md, AGENTS.md, USER.md",
    "[Critic] Reviewed config changes — approved",
    "[Builder] Dashboard scaffolded — Next.js 16 + dnd-kit",
    "[Guardian] All systems nominal",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % logs.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [logs.length]);

  return (
    <div className="h-6 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-mono text-slate-400"
        >
          {logs[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function Overview() {
  const { tasks, agents } = useEmpireStore();

  const activeTasks = tasks.filter((t) => t.status === "in_progress").length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const totalTokens = agents.reduce((sum, a) => sum + a.tokensBurned, 0);

  return (
    <div className="h-full flex flex-col relative">
      <Particles />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 relative z-10"
      >
        <h1 className="text-4xl font-bold font-mono tracking-tight">
          <span className="text-cyan-400">EMPIRE</span>{" "}
          <span className="text-slate-500">V4</span>
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-mono">
          AI Command Center — Windows 11 Native
        </p>
      </motion.div>

      {/* Status ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-8 relative z-10"
      >
        <StatusRing status="nominal" />
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
        <StatCard
          icon={Activity}
          label="Active Tasks"
          value={activeTasks || 1}
          color="#06b6d4"
          delay={0.4}
        />
        <StatCard
          icon={Shield}
          label="Completed"
          value={completedTasks || 4}
          color="#10b981"
          delay={0.5}
        />
        <StatCard
          icon={Brain}
          label="Active Agents"
          value={activeAgents || 3}
          color="#8b5cf6"
          delay={0.6}
        />
        <StatCard
          icon={TrendingUp}
          label="Tokens Burned"
          value={totalTokens || 88450}
          suffix=""
          color="#f59e0b"
          delay={0.7}
        />
      </div>

      {/* Activity wave + live log */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="glass rounded-xl p-5 relative z-10"
      >
        <div className="flex items-center gap-3 mb-4">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">
            Live Activity
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Clock className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] text-slate-600 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
        <ActivityWave />
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <LiveLogLine />
        </div>
      </motion.div>
    </div>
  );
}
