/**
 * HeirView — The beneficiary's real-time inheritance dashboard.
 *
 * Somnia Reactivity role: This is the centrepiece of the entire app.
 * A beneficiary opens this view (no wallet needed) and simply watches.
 * When the will owner misses their check-in and someone calls execute(),
 * Somnia Reactivity pushes the WillExecuted and BeneficiaryPaid events
 * directly to this browser tab over WebSocket — the heir cards flip from
 * WAITING → RECEIVED with their exact payout amount, in real time,
 * with zero polling and zero page refresh.
 *
 * This is the promise of the app: "You will know the instant it happens."
 */

import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import type { WillState, BeneficiaryStatus } from "../hooks/useReactiveWill";

interface Props {
  willState: WillState | null;
  statuses: Map<string, BeneficiaryStatus>;
  isConnected: boolean;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function HeirCard({ heir, willState }: { heir: BeneficiaryStatus; willState: WillState | null }) {
  const pct = (heir.basisPoints / 100).toFixed(0);

  return (
    <AnimatePresence mode="wait">
      {heir.status === "received" ? (
        <motion.div
          key="received"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-5 relative overflow-hidden"
        >
          {/* Subtle glow on received */}
          <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-zinc-200">{shortAddr(heir.address)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{pct}% allocation</p>
            </div>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300"
            >
              RECEIVED
            </motion.span>
          </div>

          {heir.receivedAmount !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4"
            >
              <p className="text-xs text-zinc-500 mb-0.5">Inheritance received</p>
              <p className="text-3xl font-bold font-mono text-emerald-400">
                +{parseFloat(formatEther(heir.receivedAmount)).toFixed(4)} STT
              </p>
            </motion.div>
          )}
        </motion.div>
      ) : heir.status === "incoming" ? (
        <motion.div
          key="incoming"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-zinc-200">{shortAddr(heir.address)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{pct}% allocation</p>
            </div>
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300"
            >
              INCOMING
            </motion.span>
          </div>
          <p className="mt-3 text-sm text-amber-400/70">
            Will is executing — funds on their way…
          </p>
          {willState?.balance !== undefined && (
            <p className="mt-1 text-2xl font-bold font-mono text-amber-400">
              ~{parseFloat(formatEther((willState.balance * BigInt(heir.basisPoints)) / 10000n)).toFixed(4)} STT
            </p>
          )}
        </motion.div>
      ) : (
        <motion.div
          key="waiting"
          layout
          className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-zinc-300">{shortAddr(heir.address)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{pct}% allocation</p>
            </div>
            <span className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-500">
              WAITING
            </span>
          </div>
          {willState?.balance !== undefined && willState.balance > 0n && (
            <div className="mt-3">
              <p className="text-xs text-zinc-600">Expected inheritance</p>
              <p className="text-xl font-bold font-mono text-zinc-400">
                {parseFloat(formatEther((willState.balance * BigInt(heir.basisPoints)) / 10000n)).toFixed(4)} STT
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function HeirView({ willState, statuses }: Props) {
  const heirs = Array.from(statuses.values());
  const hasExecuted = willState?.isExecuted ?? false;
  const balance = willState?.balance ?? 0n;
  const hasBalance = balance > 0n;

  return (
    <div className="space-y-6">

      {/* Will summary */}
      {willState && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-300">Will Overview</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              hasExecuted
                ? "bg-zinc-800 text-zinc-400"
                : "bg-emerald-950/50 border border-emerald-700/40 text-emerald-400"
            }`}>
              {hasExecuted ? "EXECUTED" : "ACTIVE"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-600">Total in vault</p>
              <p className="font-mono font-bold text-white mt-0.5">
                {hasBalance ? `${parseFloat(formatEther(balance)).toFixed(4)} STT` : "Empty"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600">Beneficiaries</p>
              <p className="font-mono font-bold text-white mt-0.5">
                {willState.beneficiaries.length} people
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Heir cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-300">Inheritance Distribution</h3>
          {hasExecuted && (
            <span className="text-xs text-emerald-500">All funds distributed</span>
          )}
        </div>

        {heirs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 py-10 text-center">
            <p className="text-zinc-500 text-sm">No beneficiaries set yet.</p>
            <p className="text-zinc-700 text-xs mt-1">The owner needs to add heirs first.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {heirs.map((heir) => (
              <HeirCard key={heir.address} heir={heir} willState={willState ?? null} />
            ))}
          </div>
        )}
      </div>

      {/* Somnia explanation */}
      {!hasExecuted && heirs.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 px-4 py-3 text-xs text-zinc-600 space-y-1">
          <p className="text-zinc-500 font-medium">How you'll find out</p>
          <p>
            When the will owner misses their check-in and the will is executed, Somnia's
            reactive infrastructure pushes the event directly to this browser over WebSocket.
            The cards above will flip to <span className="text-emerald-500 font-medium">RECEIVED</span> with
            the exact amounts — live, in front of you, with no action on your part.
          </p>
        </div>
      )}
    </div>
  );
}
