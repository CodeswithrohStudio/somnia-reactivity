/**
 * ExecutionAlert — Full-screen overlay when a will executes.
 *
 * Somnia Reactivity role: This overlay appears because a WillExecuted event
 * arrived via Somnia Reactivity WebSocket — not because the user refreshed.
 * It is the emotional payoff of the entire protocol: the moment an heir
 * finds out, live, that their inheritance has arrived.
 */

import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import type { BeneficiaryStatus } from "../hooks/useReactiveWill";

interface Props {
  isVisible: boolean;
  totalAmount: bigint | null;
  heirs: BeneficiaryStatus[];
  txHash?: string;
  onDismiss: () => void;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ExecutionAlert({ isVisible, totalAmount, heirs, txHash, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none"
          >
            <div className="w-full max-w-md pointer-events-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 px-6 pt-8 pb-6 text-center border-b border-zinc-800">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
                  className="text-4xl mb-4"
                >
                  📜
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-white"
                >
                  Will Executed
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-zinc-400 mt-2"
                >
                  Funds have been distributed to all beneficiaries.
                </motion.p>
                {totalAmount !== null && (
                  <motion.p
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 }}
                    className="mt-4 text-3xl font-bold font-mono text-emerald-400"
                  >
                    {parseFloat(formatEther(totalAmount)).toFixed(4)} STT
                  </motion.p>
                )}
              </div>

              {/* Heir payouts */}
              <div className="px-6 py-5 space-y-3">
                {heirs.map((heir, i) => (
                  <motion.div
                    key={heir.address}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-mono text-sm text-zinc-200">{shortAddr(heir.address)}</p>
                      <p className="text-xs text-zinc-500">{(heir.basisPoints / 100).toFixed(0)}% allocation</p>
                    </div>
                    <div className="text-right">
                      {heir.receivedAmount !== undefined ? (
                        <p className="font-mono font-bold text-emerald-400">
                          +{parseFloat(formatEther(heir.receivedAmount)).toFixed(4)} STT
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-600">Amount pending</p>
                      )}
                      <p className="text-xs text-emerald-600 mt-0.5">✓ Received</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 space-y-3">
                {txHash && (
                  <a
                    href={`https://shannon-explorer.somnia.network/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors truncate"
                  >
                    View on Somnia Explorer →
                  </a>
                )}
                <p className="text-center text-xs text-zinc-700">
                  ⚡ Delivered via Somnia Reactivity WebSocket — not from a page refresh
                </p>
                <button
                  onClick={onDismiss}
                  className="w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold py-3 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
