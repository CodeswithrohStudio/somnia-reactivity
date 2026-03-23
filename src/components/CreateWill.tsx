/**
 * CreateWill — Deposit STT and assign beneficiaries.
 *
 * Somnia Reactivity role: After a deposit or setBeneficiaries call succeeds,
 * Somnia Reactivity will push the resulting Deposited / BeneficiariesSet
 * events to the live feed in WillExecutionFeed without any page refresh.
 * This component only handles write operations; all reactive state updates
 * happen automatically via useReactiveWill subscriptions.
 */

import { useState } from "react";
import { parseEther, parseAbi, isAddress } from "viem";
import { useWalletClient, usePublicClient, useAccount, useChainId, useSwitchChain } from "wagmi";
import { WILL_CONTRACT_ADDRESS, SOMNIA_TESTNET } from "../config/somnia";
import type { Chain } from "viem";

// Viem-compatible chain object for writeContract's `chain` param
const SOMNIA_CHAIN: Chain = {
  id: SOMNIA_TESTNET.id,
  name: SOMNIA_TESTNET.name,
  nativeCurrency: { ...SOMNIA_TESTNET.nativeCurrency },
  rpcUrls: {
    default: { http: [SOMNIA_TESTNET.rpcUrls.default.http[0]] },
  },
  blockExplorers: {
    default: { ...SOMNIA_TESTNET.blockExplorers.default },
  },
  testnet: true,
};

const WILL_WRITE_ABI = parseAbi([
  "function deposit() external payable",
  "function setBeneficiaries(address[] wallets, uint256[] bps) external",
]);

const SOMNIA_CHAIN_ID = SOMNIA_TESTNET.id; // 50312

/** Evenly splits 10000 bps across n heirs. Remainder goes to the last. */
function computeBps(count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor(10000 / count);
  const remainder = 10000 - base * count;
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? base + remainder : base
  );
}

export function CreateWill({ onSuccess }: { onSuccess: () => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [depositAmount, setDepositAmount] = useState("");
  const [heirAddresses, setHeirAddresses] = useState<string[]>([""]);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSettingHeirs, setIsSettingHeirs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const contractNotSet =
    WILL_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000";

  const isWrongChain = chainId !== SOMNIA_CHAIN_ID;

  // Auto-computed allocations — always sums to exactly 10000
  const bpsAllocations = computeBps(heirAddresses.length);

  /** Manually switch chain (banner button). writeContract handles it automatically too. */
  const ensureCorrectChain = async () => {
    if (!isWrongChain) return;
    setIsSwitching(true);
    try {
      await switchChainAsync({ chainId: SOMNIA_CHAIN_ID });
    } finally {
      setIsSwitching(false);
    }
  };

  const handleDeposit = async () => {
    if (!walletClient || !publicClient) { setError("Connect wallet."); return; }
    setError(null); setSuccess(null); setIsDepositing(true);
    try {
      const hash = await walletClient.writeContract({
        address: WILL_CONTRACT_ADDRESS,
        abi: WILL_WRITE_ABI,
        functionName: "deposit",
        value: parseEther(depositAmount),
        chain: SOMNIA_CHAIN, // forces wagmi to switch chain before sending
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setSuccess("Deposit confirmed.");
      setDepositAmount("");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.slice(0, 200));
    } finally {
      setIsDepositing(false);
    }
  };

  const handleSetHeirs = async () => {
    if (!walletClient || !publicClient) { setError("Connect wallet."); return; }
    const invalid = heirAddresses.find((a) => !isAddress(a));
    if (invalid) { setError(`Invalid address: ${invalid}`); return; }
    if (heirAddresses.length === 0) { setError("Add at least one beneficiary."); return; }

    setError(null); setSuccess(null); setIsSettingHeirs(true);
    try {
      const wallets = heirAddresses.map((a) => a as `0x${string}`);
      const bpsArr = bpsAllocations.map((b) => BigInt(b));

      const hash = await walletClient.writeContract({
        address: WILL_CONTRACT_ADDRESS,
        abi: WILL_WRITE_ABI,
        functionName: "setBeneficiaries",
        args: [wallets, bpsArr],
        chain: SOMNIA_CHAIN, // forces wagmi to switch chain before sending
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setSuccess("Beneficiaries saved.");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.slice(0, 200));
    } finally {
      setIsSettingHeirs(false);
    }
  };

  const updateAddress = (i: number, value: string) => {
    setHeirAddresses((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  };

  const addHeir = () => setHeirAddresses((p) => [...p, ""]);
  const removeHeir = (i: number) =>
    setHeirAddresses((p) => p.filter((_, idx) => idx !== i));

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 text-center text-sm text-zinc-400">
        Connect your wallet to create a will.
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5 space-y-6">
      <h2 className="text-lg font-semibold text-white">Create / Manage Will</h2>

      {contractNotSet && (
        <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-500/30 rounded-lg px-3 py-2">
          Set VITE_WILL_CONTRACT_ADDRESS in .env after deploying the contract.
        </p>
      )}

      {/* Wrong chain banner */}
      {isWrongChain && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-950/40 border border-amber-500/40 px-3 py-2">
          <p className="text-xs text-amber-300">
            Wrong network — switch to <span className="font-semibold">Somnia Testnet</span> (ID 50312)
          </p>
          <button
            onClick={ensureCorrectChain}
            disabled={isSwitching}
            className="shrink-0 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-3 py-1 transition-colors disabled:opacity-50"
          >
            {isSwitching ? "Switching…" : "Switch"}
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Connected:{" "}
        <span className="font-mono text-zinc-300">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        {!isWrongChain && (
          <span className="ml-2 text-emerald-400">✓ Somnia Testnet</span>
        )}
      </p>

      {/* Deposit */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Deposit STT</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="0.1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="flex-1 rounded-lg bg-zinc-900 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
          />
          <button
            onClick={handleDeposit}
            disabled={isDepositing || !depositAmount || contractNotSet}
            className="rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-zinc-100 transition-colors"
          >
            {isDepositing ? "…" : "Deposit"}
          </button>
        </div>
      </div>

      {/* Beneficiaries — auto BPS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">Beneficiaries</label>
          <span className="text-xs text-zinc-500">
            Split equally · {heirAddresses.length} heir{heirAddresses.length !== 1 ? "s" : ""}
          </span>
        </div>

        {heirAddresses.map((addr, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="0x… address"
              value={addr}
              onChange={(e) => updateAddress(i, e.target.value)}
              className="flex-1 rounded-lg bg-zinc-900 border border-zinc-600 px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            {/* Read-only auto-calculated share */}
            <div className="shrink-0 rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-emerald-400 font-semibold min-w-[64px] text-center">
              {((bpsAllocations[i] / 100)).toFixed(1)}%
            </div>
            {heirAddresses.length > 1 && (
              <button
                onClick={() => removeHeir(i)}
                className="text-zinc-500 hover:text-red-400 transition-colors text-sm px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addHeir}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          + Add beneficiary
        </button>

        <button
          onClick={handleSetHeirs}
          disabled={isSettingHeirs || contractNotSet || heirAddresses.some((a) => !a)}
          className="w-full rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {isSettingHeirs ? "Saving…" : "Save Beneficiaries"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 break-all">{error}</p>}
      {success && <p className="text-xs text-emerald-400">{success}</p>}
    </section>
  );
}
