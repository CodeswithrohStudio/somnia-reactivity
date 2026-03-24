/**
 * WillHealthCard — Compact horizontal status strip.
 * Shows the will's health at a glance in a single row.
 * Somnia Reactivity keeps all values here up-to-date without polling.
 */

import { motion } from "framer-motion";
import { formatEther } from "viem";
import type { WillState } from "../hooks/useReactiveWill";

interface Props {
  willState: WillState | null;
  onShareClick: () => void;
  sharecopied: boolean;
  onManageClick: () => void;
}

type HealthStatus = "protected" | "warning" | "critical" | "overdue" | "executed" | "empty";

function getStatus(w: WillState | null): HealthStatus {
  if (!w) return "empty";
  if (w.isExecuted) return "executed";
  const now = Math.floor(Date.now() / 1000);
  const rem = Number(w.checkInDeadline) - now;
  if (rem <= 0) return "overdue";
  if (rem <= 86400) return "critical";
  if (rem <= 7 * 86400) return "warning";
  return "protected";
}

function getDays(deadline: bigint): number {
  return Math.max(0, Math.floor((Number(deadline) - Math.floor(Date.now() / 1000)) / 86400));
}

const CFG = {
  protected: { label: "PROTECTED",  dot: "bg-emerald-400", text: "text-emerald-400", bar: "bg-emerald-500", pulse: false },
  warning:   { label: "CHECK IN SOON", dot: "bg-amber-400",   text: "text-amber-400",   bar: "bg-amber-500",   pulse: false },
  critical:  { label: "URGENT",     dot: "bg-red-400",    text: "text-red-400",    bar: "bg-red-500",    pulse: true  },
  overdue:   { label: "OVERDUE",    dot: "bg-red-500",    text: "text-red-400",    bar: "bg-red-600",    pulse: true  },
  executed:  { label: "EXECUTED",   dot: "bg-zinc-500",   text: "text-zinc-400",   bar: "bg-zinc-600",   pulse: false },
  empty:     { label: "NOT SET UP", dot: "bg-zinc-600",   text: "text-zinc-500",   bar: "bg-zinc-700",   pulse: false },
};

export function WillHealthCard({ willState, onShareClick, sharecopied, onManageClick }: Props) {
  const status = getStatus(willState);
  const cfg = CFG[status];
  const days = willState ? getDays(willState.checkInDeadline) : 0;
  const balance = willState?.balance ?? 0n;
  const heirCount = willState?.beneficiaries.length ?? 0;

  const now = Math.floor(Date.now() / 1000);
  const deadline = willState ? Number(willState.checkInDeadline) : 0;
  const totalWindow = 30 * 86400;
  const progressPct = deadline > 0
    ? Math.min(100, Math.max(0, Math.round((1 - (deadline - now) / totalWindow) * 100)))
    : 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
      {/* Main row */}
      <div className="px-5 py-4 flex items-center gap-6 flex-wrap">
        {/* Status */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.span
            className={`h-2 w-2 rounded-full ${cfg.dot}`}
            animate={cfg.pulse ? { scale: [1, 1.6, 1], opacity: [1, 0.5, 1] } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className={`text-xs font-bold tracking-widest ${cfg.text}`}>{cfg.label}</span>
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        {/* Stats */}
        <div className="flex items-center gap-5 flex-1 flex-wrap">
          <Stat
            label="Balance"
            value={balance > 0n ? `${parseFloat(formatEther(balance)).toFixed(4)}` : "0"}
            unit="STT"
          />
          <Stat
            label={status === "overdue" ? "Overdue" : "Days left"}
            value={String(days)}
            unit="days"
            highlight={status === "critical" || status === "overdue"}
          />
          <Stat
            label="Heirs"
            value={String(heirCount)}
            unit={heirCount === 1 ? "person" : "people"}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            onClick={onManageClick}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors"
          >
            Manage Will
          </button>
          <button
            onClick={onShareClick}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors"
          >
            {sharecopied ? "✓ Copied" : "Share ↗"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/5">
        <motion.div
          className={`h-full ${cfg.bar} opacity-60`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, unit, highlight }: {
  label: string; value: string; unit: string; highlight?: boolean;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs text-zinc-600">{label}</p>
      <p className={`font-mono font-bold leading-tight ${highlight ? "text-red-400" : "text-white"}`}>
        {value} <span className="text-xs font-normal text-zinc-500">{unit}</span>
      </p>
    </div>
  );
}
