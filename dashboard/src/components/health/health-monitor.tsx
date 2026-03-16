"use client";

import { useEffect } from "react";
import { useEmpireStore } from "@/lib/store";
import type { ServiceHealth } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "motion/react";
import {
  Zap,
  Globe,
  Monitor,
  Database,
  Chrome,
  Github,
  Brain,
} from "lucide-react";

const DEMO_SERVICES: ServiceHealth[] = [
  {
    name: "OpenClaw Gateway",
    status: "healthy",
    url: "http://127.0.0.1:18789",
    latency: 12,
    checkedAt: new Date().toISOString(),
  },
  {
    name: "Empire Dashboard",
    status: "healthy",
    url: "http://localhost:4000",
    latency: 5,
    checkedAt: new Date().toISOString(),
  },
  {
    name: "Chrome DevTools",
    status: "unknown",
    url: "http://localhost:9222",
    checkedAt: new Date().toISOString(),
  },
  {
    name: "GitHub API",
    status: "healthy",
    latency: 145,
    checkedAt: new Date().toISOString(),
  },
  {
    name: "Mem0 Cloud",
    status: "unknown",
    checkedAt: new Date().toISOString(),
  },
  {
    name: "Claude API",
    status: "healthy",
    latency: 320,
    checkedAt: new Date().toISOString(),
  },
];

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "OpenClaw Gateway": Zap,
  "Empire Dashboard": Monitor,
  "Chrome DevTools": Chrome,
  "GitHub API": Github,
  "Mem0 Cloud": Database,
  "Claude API": Brain,
};

const STATUS_STYLES: Record<
  ServiceHealth["status"],
  { dot: string; text: string; glow: string }
> = {
  healthy: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    glow: "shadow-[0_0_10px_rgba(16,185,129,0.3)]",
  },
  degraded: {
    dot: "bg-amber-400",
    text: "text-amber-400",
    glow: "shadow-[0_0_10px_rgba(245,158,11,0.3)]",
  },
  down: {
    dot: "bg-red-500",
    text: "text-red-400",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.3)]",
  },
  unknown: {
    dot: "bg-slate-500",
    text: "text-slate-400",
    glow: "",
  },
};

export function HealthMonitor() {
  const { services, setServices } = useEmpireStore();

  useEffect(() => {
    if (services.length === 0) setServices(DEMO_SERVICES);
  }, [services.length, setServices]);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const totalCount = services.length;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-cyan-400 tracking-tight">
          System Health
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {healthyCount}/{totalCount} services operational
        </p>
      </div>

      {/* Status bar */}
      <div className="glass rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="flex gap-1.5">
          {services.map((svc) => {
            const styles = STATUS_STYLES[svc.status];
            return (
              <div
                key={svc.name}
                className={`w-3 h-3 rounded-full ${styles.dot} ${styles.glow} ${
                  svc.status === "healthy" ? "animate-pulse" : ""
                }`}
                title={`${svc.name}: ${svc.status}`}
              />
            );
          })}
        </div>
        <span className="text-sm font-mono text-slate-400">
          {healthyCount === totalCount
            ? "All systems nominal"
            : `${totalCount - healthyCount} service${
                totalCount - healthyCount > 1 ? "s" : ""
              } need attention`}
        </span>
      </div>

      {/* Service grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((svc, i) => {
          const Icon = SERVICE_ICONS[svc.name] || Globe;
          const styles = STATUS_STYLES[svc.status];

          return (
            <motion.div
              key={svc.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="glass glass-hover border-white/[0.08]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-400" />
                      </div>
                      <CardTitle className="text-sm font-medium text-slate-200">
                        {svc.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${styles.dot} ${
                          svc.status === "healthy" ? "animate-pulse" : ""
                        }`}
                      />
                      <span className={`text-xs font-mono ${styles.text}`}>
                        {svc.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs">
                    {svc.url && (
                      <span className="text-slate-500 font-mono truncate">
                        {svc.url}
                      </span>
                    )}
                    {svc.latency !== undefined && (
                      <span
                        className={`font-mono ${
                          svc.latency < 100
                            ? "text-emerald-400"
                            : svc.latency < 300
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      >
                        {svc.latency}ms
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
