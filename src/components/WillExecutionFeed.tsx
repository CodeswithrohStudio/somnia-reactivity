/**
 * WillExecutionFeed — Live on-chain event log.
 *
 * Somnia Reactivity role: This component is the raw demonstration of
 * Somnia's real-time capability. Every entry in this feed arrived via
 * a Somnia Reactivity WebSocket push — not from a polling loop or manual
 * refresh. New events slide in from the top the instant they land on-chain.
 * This is the component judges should watch during the demo.
 */

import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "viem";
import type { LiveEvent } from "../hooks/useReactiveWill";

interface Props {
  events: LiveEvent[];
}

const EVENT_STYLES: Record<string, { bg: string; border: string; label: string; dot: string }> = {
  WillExecuted: {
    bg: "bg-red-950/40",
    border: "border-red-500/30",
    label: "text-red-400",
    dot: "bg-red-500",
  },
  BeneficiaryPaid: {
    bg: "bg-emerald-950/30",
    border: "border-emerald-500/30",
    label: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  CheckInMissed: {
    bg: "bg-amber-950/30",
    border: "border-amber-500/30",
    label: "text-amber-400",
    dot: "bg-amber-500",
  },
  CheckedIn: {
    bg: "bg-blue-950/30",
    border: "border-blue-500/30",
    label: "text-blue-400",
    dot: "bg-blue-500",
  },
  Deposited: {
    bg: "bg-violet-950/30",
    border: "border-violet-500/30",
    label: "text-violet-400",
    dot: "bg-violet-500",
  },
};

function EventRow({ event }: { event: LiveEvent }) {
  const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.Deposited;

  const summary = () => {
    const d = event.data as Record<string, bigint | string | number>;
    if (event.type === "WillExecuted") {
      return `Total: ${formatEther(d.totalAmount as bigint)} STT`;
    }
    if (event.type === "BeneficiaryPaid") {
      return `Heir: ${String(d.heir).slice(0, 6)}…${String(d.heir).slice(-4)} · ${formatEther(d.amount as bigint)} STT`;
    }
    if (event.type === "CheckInMissed") {
      return `Deadline: ${new Date(Number(d.deadline) * 1000).toLocaleString()}`;
    }
    if (event.type === "CheckedIn") {
      return `New deadline: ${new Date(Number(d.newDeadline) * 1000).toLocaleString()}`;
    }
    return "";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${style.bg} ${style.border}`}
    >
      <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-sm font-semibold ${style.label}`}>{event.type}</span>
          <span className="text-xs text-zinc-500 tabular-nums whitespace-nowrap">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
        {summary() && (
          <p className="mt-0.5 truncate text-xs text-zinc-400">{summary()}</p>
        )}
        {event.txHash && (
          <a
            href={`https://shannon-explorer.somnia.network/tx/${event.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate font-mono text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {event.txHash.slice(0, 14)}…
          </a>
        )}
      </div>
    </motion.div>
  );
}

export function WillExecutionFeed({ events }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-white">Live Event Feed</h2>
        <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
          Somnia Reactivity
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500 italic py-4 text-center">
            Waiting for on-chain events…
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
