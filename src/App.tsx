/**
 * App — Root layout.
 * Two views: "My Will" (owner) and "I'm an Heir" (beneficiary).
 * Both share the same Somnia Reactivity subscription — zero polling.
 */

import { useState, useEffect } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected } from "wagmi/connectors";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { AnimatePresence, motion } from "framer-motion";
import { SOMNIA_TESTNET } from "./config/somnia";
import { useReactiveWill } from "./hooks/useReactiveWill";
import { WillHealthCard } from "./components/WillHealthCard";
import { CreateWill } from "./components/CreateWill";
import { CheckInPanel } from "./components/CheckInPanel";
import { HeirView } from "./components/HeirView";
import { WillExecutionFeed } from "./components/WillExecutionFeed";
import { ExecutionAlert } from "./components/ExecutionAlert";
import { Hero } from "./components/Hero";

const wagmiConfig = createConfig({
  chains: [SOMNIA_TESTNET],
  connectors: [injected()],
  transports: { [SOMNIA_TESTNET.id]: http("https://dream-rpc.somnia.network") },
});
const queryClient = new QueryClient();

type Tab = "owner" | "heir";

// ─── Manage Will Modal ────────────────────────────────────────────────────────

function ManageModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean; onClose: () => void; onSuccess: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-md pointer-events-auto rounded-2xl border border-white/10 bg-[#0e0e1a] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white">Manage Will</h2>
                <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors text-lg leading-none">×</button>
              </div>
              <div className="p-5">
                <CreateWill onSuccess={() => { onSuccess(); onClose(); }} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Inner App ────────────────────────────────────────────────────────────────

function InnerApp() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const {
    willState, liveEvents, beneficiaryStatuses,
    isConnected: reactivityOn, refreshWillState, eventCount,
  } = useReactiveWill();

  const [tab, setTab] = useState<Tab>("owner");
  const [manageOpen, setManageOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [execAlert, setExecAlert] = useState(false);
  const [execTxHash, setExecTxHash] = useState<string | undefined>();
  const [execTotal, setExecTotal] = useState<bigint | null>(null);

  useEffect(() => {
    const latest = liveEvents[0];
    if (latest?.type === "WillExecuted") {
      const d = latest.data as { totalAmount?: bigint };
      setExecTotal(d.totalAmount ?? null);
      setExecTxHash(latest.txHash);
      setExecAlert(true);
    }
  }, [liveEvents[0]?.id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  };

  const heirs = Array.from(beneficiaryStatuses.values());

  return (
    <>
      <div
        className="min-h-screen text-white flex flex-col"
        style={{
          backgroundColor: "#07070f",
          backgroundImage: `
            radial-gradient(ellipse 100% 55% at 50% 0%, rgba(120, 40, 230, 0.28) 0%, rgba(80, 20, 180, 0.08) 45%, transparent 70%),
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 52px 52px, 52px 52px",
          backgroundAttachment: "fixed",
        }}
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className={`border-b border-white/5 px-6 py-3.5 flex items-center justify-between backdrop-blur-sm bg-black/20 sticky top-0 z-40 ${!isConnected && tab === "owner" ? "hidden" : ""}`}>
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold tracking-tight text-white">Will.eth</h1>
            <div className="flex items-center gap-1.5">
              <motion.span
                className={`h-1.5 w-1.5 rounded-full ${reactivityOn ? "bg-emerald-400" : "bg-zinc-600"}`}
                animate={reactivityOn ? { scale: [1, 1.5, 1] } : {}}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <span className="text-xs text-zinc-600">
                {reactivityOn ? "Somnia live" : "connecting…"}
              </span>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-600 hidden sm:block">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              <button onClick={() => disconnect()}
                className="rounded-lg border border-white/8 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => connect({ connector: connectors[0] })}
              className="rounded-lg bg-white text-black px-4 py-1.5 text-sm font-semibold hover:bg-zinc-100 transition-colors">
              Connect Wallet
            </button>
          )}
        </header>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className={`border-b border-white/5 px-6 bg-black/10 ${!isConnected && tab === "owner" ? "hidden" : ""}`}>
          <div className="flex max-w-5xl mx-auto">
            {([
              { id: "owner" as Tab, label: "My Will" },
              { id: "heir"  as Tab, label: "I'm an Heir" },
            ]).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-white text-white"
                    : "border-transparent text-zinc-600 hover:text-zinc-400"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main ───────────────────────────────────────────────────────── */}
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">

          {/* ── OWNER TAB ─────────────────────────────────────────────── */}
          {tab === "owner" && (
            <>
              {!isConnected ? (
                <div className="fixed inset-0 z-30">
                  <Hero
                    onGetStarted={() => connect({ connector: connectors[0] })}
                    onSeeHeir={() => setTab("heir")}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Health strip — always visible */}
                  <WillHealthCard
                    willState={willState}
                    onShareClick={handleShare}
                    sharecopied={shareCopied}
                    onManageClick={() => setManageOpen(true)}
                  />

                  {/* Two-column row */}
                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Left: check-in + event feed */}
                    <div className="space-y-4">
                      <CheckInPanel willState={willState} onCheckInSuccess={refreshWillState} />
                      <WillExecutionFeed events={liveEvents} eventCount={eventCount} />
                    </div>

                    {/* Right: heirs */}
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-300">Your Heirs</h3>
                        <button onClick={handleShare}
                          className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors">
                          {shareCopied ? "✓ Link copied" : "Share with heirs →"}
                        </button>
                      </div>

                      {heirs.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-sm text-zinc-600">No heirs set up yet.</p>
                          <button
                            onClick={() => setManageOpen(true)}
                            className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            + Add beneficiaries →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {heirs.map((heir) => (
                            <div key={heir.address}
                              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                              <div>
                                <p className="font-mono text-sm text-zinc-300">
                                  {heir.address.slice(0,6)}…{heir.address.slice(-4)}
                                </p>
                                <p className="text-xs text-zinc-600 mt-0.5">
                                  {(heir.basisPoints / 100).toFixed(0)}%
                                  {willState?.balance && willState.balance > 0n && (
                                    <> · {(Number(willState.balance) * heir.basisPoints / 10000 / 1e18).toFixed(4)} STT</>
                                  )}
                                </p>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                heir.status === "received" ? "bg-emerald-900/50 text-emerald-300"
                                : heir.status === "incoming" ? "bg-amber-900/50 text-amber-300"
                                : "bg-white/5 text-zinc-500"
                              }`}>
                                {heir.status === "received" ? "Received"
                                : heir.status === "incoming" ? "Incoming"
                                : "Waiting"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── HEIR TAB ──────────────────────────────────────────────── */}
          {tab === "heir" && (
            <div className="max-w-lg mx-auto">
              <HeirView willState={willState} statuses={beneficiaryStatuses} />
            </div>
          )}
        </main>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className={`border-t border-white/5 px-6 py-3 text-center text-xs text-zinc-700 ${!isConnected && tab === "owner" ? "hidden" : ""}`}>
          Somnia Testnet · Chain ID 50312
          {eventCount > 0 && <span className="ml-2">· {eventCount} events, zero polling</span>}
        </footer>
      </div>

      {/* ── Manage Will Modal ───────────────────────────────────────────── */}
      <ManageModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        onSuccess={refreshWillState}
      />

      {/* ── Execution Alert ─────────────────────────────────────────────── */}
      <ExecutionAlert
        isVisible={execAlert}
        totalAmount={execTotal}
        heirs={heirs}
        txHash={execTxHash}
        onDismiss={() => setExecAlert(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InnerApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
