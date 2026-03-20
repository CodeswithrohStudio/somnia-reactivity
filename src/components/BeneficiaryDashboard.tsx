/**
 * BeneficiaryDashboard — Real-time heir status cards.
 *
 * Somnia Reactivity role: Each card's status (WAITING → INCOMING → RECEIVED)
 * is driven entirely by events pushed from Somnia's reactive infrastructure
 * via useReactiveWill. There is zero polling here. When WillExecuted fires
 * on-chain, Somnia pushes the event to useReactiveWill which updates
 * `beneficiaryStatuses`, flipping each card to RECEIVED with the exact
 * payout amount — all in the same block the transaction lands.
 */

import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import type { BeneficiaryStatus } from "../hooks/useReactiveWill";

interface Props {
  statuses: Map<string, BeneficiaryStatus>;
  isConnected: boolean;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function StatusBadge({ status }: { status: BeneficiaryStatus["status"] }) {
  if (status === "waiting") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">
        <span className="h-2 w-2 rounded-full bg-zinc-400" />
        WAITING
      </span>
    );
  }
  if (status === "incoming") {
    return (
      <motion.span
        className="inline-flex items-center gap-1 rounded-full bg-amber-900/60 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-500/40"
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        INCOMING
      </motion.span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900/60 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/40">
      <span className="h-2 w-2 rounded-full bg-emerald-400" />
      RECEIVED
    </span>
  );
}

export function BeneficiaryDashboard({ statuses, isConnected }: Props) {
  const entries = Array.from(statuses.values());

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Beneficiaries</h2>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${
            isConnected ? "text-emerald-400" : "text-zinc-500"
          }`}
        >
          <motion.span
            className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-zinc-500"}`}
            animate={isConnected ? { scale: [1, 1.4, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {isConnected ? "⚡ Live" : "Disconnected"}
        </span>
      </div>

      {/* Cards */}
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">No beneficiaries set yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {entries.map((b) => (
              <motion.div
                key={b.address}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl border p-4 transition-colors ${
                  b.status === "received"
                    ? "border-emerald-500/30 bg-emerald-950/30"
                    : b.status === "incoming"
                    ? "border-amber-500/30 bg-amber-950/20"
                    : "border-zinc-700 bg-zinc-800/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-zinc-200">{shortAddr(b.address)}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {(b.basisPoints / 100).toFixed(2)}% allocation
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                {/* Received amount — animated in when status flips */}
                <AnimatePresence>
                  {b.status === "received" && b.receivedAmount !== undefined && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 text-xl font-bold text-emerald-400"
                    >
                      +{formatEther(b.receivedAmount)} STT
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
