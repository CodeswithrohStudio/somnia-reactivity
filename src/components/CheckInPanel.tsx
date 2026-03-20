/**
 * CheckInPanel — Owner countdown and check-in control.
 *
 * Somnia Reactivity role: The checkInDeadline displayed here is sourced
 * directly from on-chain state via useReactiveWill. When a CheckedIn or
 * WillExecuted event arrives via Somnia Reactivity, refreshWillState() is
 * called automatically and this panel re-renders with the new deadline —
 * no manual polling. The colour thresholds (green → amber → red) are
 * computed against the live on-chain timestamp, not a client-side estimate.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWalletClient, usePublicClient } from "wagmi";
import { parseAbi } from "viem";
import { WILL_CONTRACT_ADDRESS } from "../config/somnia";
import type { WillState } from "../hooks/useReactiveWill";

interface Props {
  willState: WillState | null;
  lastCheckIn: number | null;
  onCheckInSuccess: () => void;
}

const WILL_WRITE_ABI = parseAbi(["function checkIn() external"]);

function useCountdown(deadlineUnix: number) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setRemaining(Math.max(0, deadlineUnix - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineUnix]);

  return remaining;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CheckInPanel({ willState, lastCheckIn, onCheckInSuccess }: Props) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isCheckinIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadline = willState ? Number(willState.checkInDeadline) : 0;
  const remaining = useCountdown(deadline);
  const sevenDays = 7 * 24 * 3600;
  const oneDay = 24 * 3600;

  const urgency =
    remaining === 0
      ? "overdue"
      : remaining <= oneDay
      ? "critical"
      : remaining <= sevenDays
      ? "warning"
      : "safe";

  const colorMap = {
    overdue: { text: "text-red-400", bg: "bg-red-950/40", border: "border-red-500/40", pulse: true },
    critical: { text: "text-red-400", bg: "bg-red-950/30", border: "border-red-500/30", pulse: true },
    warning: { text: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-500/30", pulse: false },
    safe: { text: "text-emerald-400", bg: "bg-emerald-950/20", border: "border-emerald-500/20", pulse: false },
  }[urgency];

  const handleCheckIn = async () => {
    if (!walletClient || !publicClient) {
      setError("Connect your wallet first.");
      return;
    }
    setIsCheckingIn(true);
    setError(null);
    try {
      const hash = await walletClient.writeContract({
        address: WILL_CONTRACT_ADDRESS,
        abi: WILL_WRITE_ABI,
        functionName: "checkIn",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      onCheckInSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <section className={`rounded-xl border p-5 space-y-4 ${colorMap.bg} ${colorMap.border}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Check-In Status</h2>
        <motion.span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            urgency === "safe"
              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/30"
              : "bg-red-900/60 text-red-300 border border-red-500/30"
          }`}
          animate={colorMap.pulse ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          {urgency === "safe" || urgency === "warning" ? "ACTIVE" : "OVERDUE"}
        </motion.span>
      </div>

      {/* Countdown */}
      <div className="text-center py-2">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Next check-in due in</p>
        <motion.p
          className={`text-4xl font-mono font-bold tabular-nums ${colorMap.text}`}
          animate={colorMap.pulse ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {formatDuration(remaining)}
        </motion.p>
        {deadline > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            Deadline: {new Date(deadline * 1000).toLocaleString()}
          </p>
        )}
      </div>

      {/* Last check-in */}
      {lastCheckIn && (
        <p className="text-xs text-zinc-500 text-center">
          Last check-in: {new Date(lastCheckIn).toLocaleString()}
        </p>
      )}

      {/* CTA */}
      {!willState?.isExecuted && (
        <button
          onClick={handleCheckIn}
          disabled={isCheckinIn}
          className="w-full rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-colors border border-white/10"
        >
          {isCheckinIn ? "Confirming…" : "Check In Now"}
        </button>
      )}

      {willState?.isExecuted && (
        <p className="text-center text-sm font-semibold text-zinc-400">Will has been executed.</p>
      )}

      {error && <p className="text-xs text-red-400 break-all">{error}</p>}
    </section>
  );
}
