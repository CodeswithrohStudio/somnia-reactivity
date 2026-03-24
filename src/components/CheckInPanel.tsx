/**
 * CheckInPanel — Compact proof-of-life widget.
 * Somnia Reactivity: CheckedIn events reset the countdown live without refresh.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useWalletClient, usePublicClient } from "wagmi";
import { parseAbi } from "viem";
import type { Chain } from "viem";
import { WILL_CONTRACT_ADDRESS, SOMNIA_TESTNET } from "../config/somnia";
import type { WillState } from "../hooks/useReactiveWill";

const SOMNIA_CHAIN: Chain = {
  id: SOMNIA_TESTNET.id,
  name: SOMNIA_TESTNET.name,
  nativeCurrency: { ...SOMNIA_TESTNET.nativeCurrency },
  rpcUrls: { default: { http: [SOMNIA_TESTNET.rpcUrls.default.http[0]] } },
  blockExplorers: { default: { ...SOMNIA_TESTNET.blockExplorers.default } },
  testnet: true,
};

const ABI = parseAbi(["function checkIn() external", "function execute() external"]);

interface Props {
  willState: WillState | null;
  onCheckInSuccess: () => void;
}

function useCountdown(deadlineUnix: number) {
  const [rem, setRem] = useState(0);
  useEffect(() => {
    const tick = () => setRem(Math.max(0, deadlineUnix - Math.floor(Date.now() / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineUnix]);
  return rem;
}

function fmtCountdown(s: number) {
  if (s <= 0) return "00:00:00";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m`;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

export function CheckInPanel({ willState, onCheckInSuccess }: Props) {
  const { data: wc } = useWalletClient();
  const pc = usePublicClient();
  const [busy, setBusy] = useState(false);
  const [fn, setFn] = useState<"checkIn"|"execute"|null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const deadline = willState ? Number(willState.checkInDeadline) : 0;
  const rem = useCountdown(deadline);
  const now = Math.floor(Date.now() / 1000);
  const overdue = deadline > 0 && deadline < now;
  const executed = willState?.isExecuted ?? false;

  const urgency = executed ? "done" : overdue ? "overdue" : rem <= 86400 ? "critical" : rem <= 7*86400 ? "warning" : "safe";

  const write = async (name: "checkIn" | "execute") => {
    if (!wc || !pc) { setError("Connect wallet."); return; }
    setError(null); setBusy(true); setFn(name);
    try {
      const hash = await wc.writeContract({ address: WILL_CONTRACT_ADDRESS, abi: ABI, functionName: name, chain: SOMNIA_CHAIN });
      await pc.waitForTransactionReceipt({ hash });
      if (name === "checkIn") { setDone(true); setTimeout(() => setDone(false), 3000); }
      onCheckInSuccess();
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)).slice(0, 160));
    } finally { setBusy(false); setFn(null); }
  };

  if (executed) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        {/* Countdown */}
        <div>
          <p className="text-xs text-zinc-600 mb-1">
            {overdue ? "Deadline passed" : "Next check-in due"}
          </p>
          <motion.p
            className={`text-2xl font-mono font-bold tabular-nums tracking-tight ${
              urgency === "critical" || urgency === "overdue" ? "text-red-400"
              : urgency === "warning" ? "text-amber-400"
              : "text-white"
            }`}
            animate={urgency === "critical" ? { opacity: [1, 0.6, 1] } : {}}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            {fmtCountdown(rem)}
          </motion.p>
        </div>

        {/* CTA */}
        <div className="shrink-0">
          {!overdue ? (
            <motion.button
              onClick={() => write("checkIn")}
              disabled={busy || !wc}
              whileTap={{ scale: 0.97 }}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-40 ${
                done
                  ? "bg-emerald-700/30 border border-emerald-600/30 text-emerald-300"
                  : urgency === "critical"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-white text-black hover:bg-zinc-100"
              }`}
            >
              {done ? "✓ Checked in" : busy && fn === "checkIn" ? "Confirming…" : "I'm Still Here"}
            </motion.button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => write("checkIn")} disabled={busy}
                className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-colors">
                {busy && fn === "checkIn" ? "…" : "Check In"}
              </button>
              <button onClick={() => write("execute")} disabled={busy || !willState?.balance || willState.balance === 0n}
                className="rounded-xl border border-red-800/50 bg-red-950/40 hover:bg-red-950/70 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-40 transition-colors">
                {busy && fn === "execute" ? "…" : "Execute"}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 break-words">{error}</p>}
    </div>
  );
}
