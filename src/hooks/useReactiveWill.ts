/**
 * useReactiveWill — Core Somnia Reactivity hook.
 *
 * Somnia Reactivity role: This hook uses the @somnia-chain/reactivity SDK to
 * subscribe to on-chain events (WillExecuted, BeneficiaryPaid, CheckInMissed)
 * via a persistent WebSocket connection to Somnia's reactive infrastructure.
 * When any subscribed event fires on-chain, Somnia pushes the notification
 * instantly to this client — no polling, no eth_getLogs, no page refresh.
 * The callbacks here drive all real-time UI state across the dashboard.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, http, keccak256, toBytes, decodeEventLog, parseAbi } from "viem";
import { SOMNIA_TESTNET, WILL_CONTRACT_ADDRESS, SOMNIA_RPC_URL } from "../config/somnia";

// ─── ABI fragments for the events we care about ────────────────────────────

const WILL_ABI = parseAbi([
  "event WillExecuted(address indexed owner, uint256 totalAmount, uint256 timestamp)",
  "event BeneficiaryPaid(address indexed heir, uint256 amount)",
  "event CheckInMissed(address indexed owner, uint256 deadline)",
  "event CheckedIn(address indexed owner, uint256 newDeadline)",
  "event Deposited(address indexed owner, uint256 amount)",
]);

// ─── Types ──────────────────────────────────────────────────────────────────

export type EventType =
  | "WillExecuted"
  | "BeneficiaryPaid"
  | "CheckInMissed"
  | "CheckedIn"
  | "Deposited";

export interface LiveEvent {
  id: string;
  type: EventType;
  timestamp: number;
  data: Record<string, unknown>;
  txHash?: string;
}

export interface BeneficiaryStatus {
  address: string;
  basisPoints: number;
  status: "waiting" | "incoming" | "received";
  receivedAmount?: bigint;
}

export interface WillState {
  owner: string;
  totalDeposited: bigint;
  checkInDeadline: bigint;
  isExecuted: boolean;
  beneficiaries: string[];
  allocations: bigint[];
  balance: bigint;
}

export interface ReactiveWillState {
  willState: WillState | null;
  liveEvents: LiveEvent[];
  beneficiaryStatuses: Map<string, BeneficiaryStatus>;
  isConnected: boolean;
  lastCheckIn: number | null;
  refreshWillState: () => Promise<void>;
  // Latency tracking — set before sending a tx so the hook can measure
  // the gap between tx submission and the Somnia Reactivity push arriving.
  markTxSubmitted: () => void;
  lastEventLatencyMs: number | null;
  eventCount: number;
}

// ─── Helper: compute event topic0 from signature ────────────────────────────

function eventTopic(sig: string): `0x${string}` {
  return keccak256(toBytes(sig));
}

// ─── Contract read ABI ───────────────────────────────────────────────────────

const WILL_READ_ABI = parseAbi([
  "function getWillStatus() view returns (address owner, uint256 totalDeposited, uint256 checkInDeadline, bool isExecuted, address[] beneficiaryWallets, uint256[] allocations)",
  "function getBalance() view returns (uint256)",
]);

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReactiveWill(): ReactiveWillState {
  const [willState, setWillState] = useState<WillState | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [beneficiaryStatuses, setBeneficiaryStatuses] = useState<Map<string, BeneficiaryStatus>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<number | null>(null);
  const [lastEventLatencyMs, setLastEventLatencyMs] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState(0);

  const sdkRef = useRef<SDK | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  // High-res timestamp set right before a tx is submitted by the caller
  const txSubmittedAtRef = useRef<number>(0);

  const markTxSubmitted = useCallback(() => {
    txSubmittedAtRef.current = performance.now();
  }, []);

  // Public client for reading contract state
  const publicClient = createPublicClient({
    chain: SOMNIA_TESTNET,
    transport: http(SOMNIA_RPC_URL),
  });

  // ── Read on-chain will state ───────────────────────────────────────────────

  const refreshWillState = useCallback(async () => {
    if (WILL_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") return;
    try {
      const [statusResult, balance] = await Promise.all([
        publicClient.readContract({
          address: WILL_CONTRACT_ADDRESS,
          abi: WILL_READ_ABI,
          functionName: "getWillStatus",
        }),
        publicClient.readContract({
          address: WILL_CONTRACT_ADDRESS,
          abi: WILL_READ_ABI,
          functionName: "getBalance",
        }),
      ]);

      const [owner, totalDeposited, checkInDeadline, isExecuted, beneficiaryWallets, allocations] =
        statusResult as [string, bigint, bigint, boolean, string[], bigint[]];

      setWillState({
        owner,
        totalDeposited,
        checkInDeadline,
        isExecuted,
        beneficiaries: beneficiaryWallets,
        allocations,
        balance: balance as bigint,
      });

      // Rebuild the beneficiary map from fresh contract data every time.
      // Always overwrite address + basisPoints so re-saves are reflected
      // immediately. Preserve existing reactive status (received/incoming)
      // unless the will is not yet executed (reset to waiting).
      setBeneficiaryStatuses((prev) => {
        const next = new Map<string, BeneficiaryStatus>();
        beneficiaryWallets.forEach((addr, i) => {
          const existing = prev.get(addr);
          next.set(addr, {
            address: addr,
            basisPoints: Number((allocations as bigint[])[i]),
            status: isExecuted ? "received"
              : existing?.status === "received" || existing?.status === "incoming"
              ? existing.status
              : "waiting",
            receivedAmount: existing?.receivedAmount,
          });
        });
        return next;
      });
    } catch (err) {
      console.error("[useReactiveWill] Failed to read will state:", err);
    }
  }, [WILL_CONTRACT_ADDRESS]);

  // ── Push a new live event to the feed ─────────────────────────────────────

  const pushEvent = useCallback((event: LiveEvent) => {
    // Measure latency from tx submission to Somnia Reactivity push
    if (txSubmittedAtRef.current > 0) {
      const latency = Math.round(performance.now() - txSubmittedAtRef.current);
      setLastEventLatencyMs(latency);
      txSubmittedAtRef.current = 0;
    }
    setEventCount((n) => n + 1);
    setLiveEvents((prev) => [event, ...prev].slice(0, 50));
  }, []);

  // ── Somnia Reactivity subscriptions ───────────────────────────────────────

  useEffect(() => {
    if (WILL_CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      console.warn("[useReactiveWill] No contract address set — reactivity disabled");
      return;
    }

    // Initialise the SDK using the public viem client
    sdkRef.current = new SDK({
      public: publicClient,
    });

    // Pre-compute event topic0 hashes
    const topics = {
      WillExecuted: eventTopic("WillExecuted(address,uint256,uint256)"),
      BeneficiaryPaid: eventTopic("BeneficiaryPaid(address,uint256)"),
      CheckInMissed: eventTopic("CheckInMissed(address,uint256)"),
      CheckedIn: eventTopic("CheckedIn(address,uint256)"),
    };

    let active = true;

    const startSubscription = async () => {
      if (!sdkRef.current) return;
      try {
        /**
         * SOMNIA REACTIVITY: Single subscription filtered to our contract.
         * Somnia's reactive infrastructure routes events from the emitter
         * address in real-time over WebSocket — no polling interval.
         */
        const sub = await sdkRef.current.subscribe({
          emitter: WILL_CONTRACT_ADDRESS,
          onData: (data) => {
            if (!active) return;

            // data.logs contains the raw log entries pushed by Somnia Reactivity
            const logs = (data as { logs?: unknown[] }).logs ?? [];

            for (const rawLog of logs) {
              const log = rawLog as {
                topics: `0x${string}`[];
                data: `0x${string}`;
                transactionHash?: `0x${string}`;
              };

              if (!log.topics || log.topics.length === 0) continue;

              const topic0 = log.topics[0];
              const id = `${topic0}-${Date.now()}-${Math.random()}`;
              const ts = Date.now();

              try {
                if (topic0 === topics.WillExecuted) {
                  const decoded = decodeEventLog({
                    abi: WILL_ABI,
                    data: log.data,
                    topics: log.topics,
                  });
                  const { totalAmount } = decoded.args as { owner: string; totalAmount: bigint; timestamp: bigint };

                  pushEvent({
                    id,
                    type: "WillExecuted",
                    timestamp: ts,
                    data: decoded.args as Record<string, unknown>,
                    txHash: log.transactionHash,
                  });

                  // Mark all beneficiaries as received
                  setBeneficiaryStatuses((prev) => {
                    const next = new Map(prev);
                    next.forEach((v, k) => {
                      const share = (totalAmount * BigInt(v.basisPoints)) / 10000n;
                      next.set(k, { ...v, status: "received", receivedAmount: share });
                    });
                    return next;
                  });

                  // Refresh on-chain state
                  refreshWillState();
                } else if (topic0 === topics.BeneficiaryPaid) {
                  const decoded = decodeEventLog({
                    abi: WILL_ABI,
                    data: log.data,
                    topics: log.topics,
                  });
                  const { heir, amount } = decoded.args as { heir: string; amount: bigint };

                  pushEvent({
                    id,
                    type: "BeneficiaryPaid",
                    timestamp: ts,
                    data: decoded.args as Record<string, unknown>,
                    txHash: log.transactionHash,
                  });

                  // Individual heir status → received
                  setBeneficiaryStatuses((prev) => {
                    const next = new Map(prev);
                    const existing = next.get(heir);
                    if (existing) {
                      next.set(heir, { ...existing, status: "received", receivedAmount: amount });
                    }
                    return next;
                  });
                } else if (topic0 === topics.CheckInMissed) {
                  const decoded = decodeEventLog({
                    abi: WILL_ABI,
                    data: log.data,
                    topics: log.topics,
                  });

                  pushEvent({
                    id,
                    type: "CheckInMissed",
                    timestamp: ts,
                    data: decoded.args as Record<string, unknown>,
                    txHash: log.transactionHash,
                  });

                  // Flip beneficiary statuses to "incoming" to signal imminent payout
                  setBeneficiaryStatuses((prev) => {
                    const next = new Map(prev);
                    next.forEach((v, k) => {
                      if (v.status === "waiting") {
                        next.set(k, { ...v, status: "incoming" });
                      }
                    });
                    return next;
                  });
                } else if (topic0 === topics.CheckedIn) {
                  const decoded = decodeEventLog({
                    abi: WILL_ABI,
                    data: log.data,
                    topics: log.topics,
                  });
                  pushEvent({
                    id,
                    type: "CheckedIn",
                    timestamp: ts,
                    data: decoded.args as Record<string, unknown>,
                    txHash: log.transactionHash,
                  });

                  setLastCheckIn(ts);
                  // Refresh so countdown resets
                  refreshWillState();
                }
              } catch (decodeErr) {
                console.warn("[useReactiveWill] Event decode error:", decodeErr);
              }
            }
          },
        });

        if (active) {
          setIsConnected(true);
          unsubscribeRef.current = sub.unsubscribe;
        }
      } catch (err) {
        console.error("[useReactiveWill] Subscription failed:", err);
        setIsConnected(false);
      }
    };

    startSubscription();
    refreshWillState();

    return () => {
      active = false;
      unsubscribeRef.current?.();
      setIsConnected(false);
    };
  }, [WILL_CONTRACT_ADDRESS]);

  return {
    willState,
    liveEvents,
    beneficiaryStatuses,
    isConnected,
    lastCheckIn,
    refreshWillState,
    markTxSubmitted,
    lastEventLatencyMs,
    eventCount,
  };
}
