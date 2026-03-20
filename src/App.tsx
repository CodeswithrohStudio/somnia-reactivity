/**
 * App — Root layout.
 *
 * Somnia Reactivity role: useReactiveWill() initialises a single SDK
 * subscription at mount time. All child components receive reactive state
 * as props — they never poll the chain themselves.
 */

import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected } from "wagmi/connectors";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { SOMNIA_TESTNET } from "./config/somnia";
import { useReactiveWill } from "./hooks/useReactiveWill";
import { BeneficiaryDashboard } from "./components/BeneficiaryDashboard";
import { WillExecutionFeed } from "./components/WillExecutionFeed";
import { CheckInPanel } from "./components/CheckInPanel";
import { CreateWill } from "./components/CreateWill";

// ─── wagmi config ─────────────────────────────────────────────────────────────

const wagmiConfig = createConfig({
  chains: [SOMNIA_TESTNET],
  connectors: [injected()],
  transports: {
    [SOMNIA_TESTNET.id]: http("https://dream-rpc.somnia.network"),
  },
});

const queryClient = new QueryClient();

// ─── Wallet connect bar ───────────────────────────────────────────────────────

function ConnectBar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-zinc-400">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-100 transition-colors"
    >
      Connect Wallet
    </button>
  );
}

// ─── Inner app (needs wagmi context) ─────────────────────────────────────────

function InnerApp() {
  const { willState, liveEvents, beneficiaryStatuses, isConnected, lastCheckIn, refreshWillState } =
    useReactiveWill();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold tracking-tight">Will.eth · Somnia Reactive</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Dead man's switch · powered by Somnia Reactivity</p>
        </div>
        <ConnectBar />
      </header>

      {/* Main grid */}
      <main className="mx-auto max-w-5xl px-4 py-8 grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <CreateWill onSuccess={refreshWillState} />
          <CheckInPanel
            willState={willState}
            lastCheckIn={lastCheckIn}
            onCheckInSuccess={refreshWillState}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <BeneficiaryDashboard statuses={beneficiaryStatuses} isConnected={isConnected} />
          <WillExecutionFeed events={liveEvents} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 text-center text-xs text-zinc-600">
        Somnia Testnet · Chain ID 50312 · Reactivity SDK{" "}
        <span className="text-zinc-500">@somnia-chain/reactivity</span>
      </footer>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InnerApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
