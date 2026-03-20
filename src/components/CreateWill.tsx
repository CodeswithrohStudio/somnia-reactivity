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
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import { WILL_CONTRACT_ADDRESS } from "../config/somnia";

const WILL_WRITE_ABI = parseAbi([
  "function deposit() external payable",
  "function setBeneficiaries(address[] wallets, uint256[] bps) external",
]);

interface Heir {
  address: string;
  bps: string; // basis points string, e.g. "5000" = 50%
}

export function CreateWill({ onSuccess }: { onSuccess: () => void }) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [depositAmount, setDepositAmount] = useState("");
  const [heirs, setHeirs] = useState<Heir[]>([{ address: "", bps: "" }]);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isSettingHeirs, setIsSettingHeirs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const contractNotSet = WILL_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000";

  const totalBps = heirs.reduce((sum, h) => sum + (parseInt(h.bps) || 0), 0);

  const handleDeposit = async () => {
    if (!walletClient || !publicClient) { setError("Connect wallet."); return; }
    setError(null); setSuccess(null); setIsDepositing(true);
    try {
      const hash = await walletClient.writeContract({
        address: WILL_CONTRACT_ADDRESS,
        abi: WILL_WRITE_ABI,
        functionName: "deposit",
        value: parseEther(depositAmount),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setSuccess("Deposit confirmed.");
      setDepositAmount("");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.slice(0, 160));
    } finally {
      setIsDepositing(false);
    }
  };

  const handleSetHeirs = async () => {
    if (!walletClient || !publicClient) { setError("Connect wallet."); return; }
    if (totalBps !== 10000) { setError("Basis points must sum to 10000."); return; }
    const invalidAddr = heirs.find((h) => !isAddress(h.address));
    if (invalidAddr) { setError(`Invalid address: ${invalidAddr.address}`); return; }

    setError(null); setSuccess(null); setIsSettingHeirs(true);
    try {
      const wallets = heirs.map((h) => h.address as `0x${string}`);
      const bpsArr = heirs.map((h) => BigInt(parseInt(h.bps)));

      const hash = await walletClient.writeContract({
        address: WILL_CONTRACT_ADDRESS,
        abi: WILL_WRITE_ABI,
        functionName: "setBeneficiaries",
        args: [wallets, bpsArr],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setSuccess("Beneficiaries saved.");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.slice(0, 160));
    } finally {
      setIsSettingHeirs(false);
    }
  };

  const updateHeir = (i: number, field: keyof Heir, value: string) => {
    setHeirs((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));
  };

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

      <p className="text-xs text-zinc-500">
        Connected: <span className="font-mono text-zinc-300">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
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

      {/* Beneficiaries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">Beneficiaries</label>
          <span className={`text-xs font-semibold ${totalBps === 10000 ? "text-emerald-400" : "text-amber-400"}`}>
            {totalBps}/10000 bps
          </span>
        </div>

        {heirs.map((h, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              placeholder="0x… address"
              value={h.address}
              onChange={(e) => updateHeir(i, "address", e.target.value)}
              className="flex-1 rounded-lg bg-zinc-900 border border-zinc-600 px-3 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            <input
              type="number"
              placeholder="bps"
              value={h.bps}
              onChange={(e) => updateHeir(i, "bps", e.target.value)}
              className="w-20 rounded-lg bg-zinc-900 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
            />
            {heirs.length > 1 && (
              <button
                onClick={() => setHeirs((p) => p.filter((_, idx) => idx !== i))}
                className="text-zinc-500 hover:text-red-400 transition-colors text-sm px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          onClick={() => setHeirs((p) => [...p, { address: "", bps: "" }])}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          + Add beneficiary
        </button>

        <button
          onClick={handleSetHeirs}
          disabled={isSettingHeirs || totalBps !== 10000 || contractNotSet}
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
